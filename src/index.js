#!/bin/env node

const debug = require('debug')('main');
const Constants = require(__dirname + '/utils/constants');
const constants = new Constants();
const Supervisor = require(__dirname + '/utils/supervisor/index.js');
const Downloader = require(__dirname + '/utils/downloader/index.js');
const BalenaCloud = require(__dirname + '/utils/balena-cloud/index.js');
const Eeprom = require(__dirname + '/utils/eeprom/index.js');
const firmata = require(__dirname + '/utils/firmata/index.js');
const flasher = require(__dirname + '/utils/flasher/index.js');
const supervisor = new Supervisor();
const downloader = new Downloader();
const cloud = new BalenaCloud();
const eeprom = new Eeprom();
const express = require('express');
const compression = require('compression');
const bodyParser = require("body-parser");

const app = express();
errorHandler = (err, req, res, next) => {
  res.status(500);
  res.render('error', {
    error: err
  });
};
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.use(errorHandler);

app.get('/firmware', async (req, res) => {
  try {
    const fw = await firmata.getVersion();
    return res.status(200).send(fw);
  } catch (error) {
    return res.status(500).send(error.message);
  }
});

app.get('/eeprom', async (req, res) => {
  try {
    const data = await eeprom.info();
    return res.status(200).send(data);
  } catch (error) {
    return res.status(500).send(error.message);
  }
});

app.post('/firmware', async (req, res) => {
  try {
    await flash(req.body.firmwareFile || constants.FIRMWARE_PATH, req.body.bootloaderFile || constants.BOOTLOADER_FILE, constants.OPENOCD_DEBUG_LEVEL);
    await supervisor.reboot();
    return res.status(200).send("OK");
  } catch (error) {
    return res.status(500).send(error.message);
  }
});

app.post('/sleep', async (req, res) => {
  if (!req.body.sleepTime || !req.body.sleepDelay) {
    return res.status(400).send("request is missing sleep time and/or sleep delay parameter");
  }
  try {
    const updating = await supervisor.updating();
    debug(`supervisor updating check: ${updating}`);
    if (updating && !req.body.force) {
      return res.status(409).send("device is updating, cannot sleep now unless force parameter is set true");
    }
    const wakeupEta = calculateWakeupEta(req.body.sleepTime,req.body.sleepDelay);
    cloud.tag('fin-status', 'sleeping');
    cloud.tag('wake-eta', wakeupEta);
    await firmata.sleep(req.body.sleepDelay, req.body.sleepTime);
    supervisor.shutdown();
    return res.status(200).send("OK");
  } catch (error) {
    return res.status(500).send(error.message);
  }
});


cloud.tag('fin-status', 'awake');

if (constants.AUTOFLASH) {
  flashFirmwareIfNeeded().then((flashResult) => {
    debug(`firmware ${flashResult.version} flashed or already running. needsReboot is ${flashResult.needsReboot}`);
    if (flashResult.needsReboot) {
      debug(`rebooting`);
      supervisor.reboot();
    }
  }).catch((error) => {
    debug(error);
  });
}

app.listen(constants.PORT);

async function flashFirmwareIfNeeded() {
  try {
    const firmwareData = await firmata.getVersion();
    debug(`running firmata implementation version: ${firmwareData.implementationVersion}`);
    if (firmwareData.implementationVersion === `v${constants.FIRMWARE_VERSION}`) {
      debug(`target firmware already running, skipping flash...`);
      return {
        version: constants.FIRMWARE_VERSION,
        needsReboot: false
      }
    } else {
      debug(`target firmware is not already running, downloading it for flashing...`);
      await downloader.downloadFirmware(constants.FIRMWARE_URL, constants.FIRMWARE_PATH, constants.FIRMWARE_NAME);
      debug(`target firmware downloaded, starting flash...`);
      cloud.tag('fin-status', 'flashing');
      await flash(constants.FIRMWARE_PATH, constants.BOOTLOADER_FILE);
      cloud.tag('fin-status', 'awake');
      return {
        version: constants.FIRMWARE_VERSION,
        needsReboot: true
      }
    }
  } catch (error) {
    throw error;
  }
}

async function flash(firmwareFile, bootloaderFile) {
  try {
    await supervisor.updateLock();
    await flasher.flash(firmwareFile, bootloaderFile, constants.OPENOCD_DEBUG_LEVEL);
    return await supervisor.updateUnlock();
  } catch (error) {
    await supervisor.updateUnlock();
    throw error;
  }
}

async function calculateWakeupEta(sleepTime,sleepDelay) {
  const currentDate = new Date();
  const wakeupDate = new Date(currentDate.getTime() + (1000 * sleepTime) + (1000 * sleepDelay));
  return dateFormat(wakeupDate, "isoDateTime");
}
