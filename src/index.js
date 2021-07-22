#!/bin/env node

const debug = require('debug')('main');
const Constants = require(__dirname + '/utils/constants');
const constants = new Constants();
const Firmata = require(__dirname + '/utils/firmata/index.js');
const Flasher = require(__dirname + '/utils/flasher/index.js');
const Supervisor = require(__dirname + '/utils/supervisor/index.js');
const Downloader = require(__dirname + '/utils/downloader/index.js');
const firmata = new Firmata();
const flasher = new Flasher();
const supervisor = new Supervisor();
const downloader = new Downloader();
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

app.get('/v1/firmware', async (req, res) => {
  try {
    const fw = await firmata.getVersion();
    return res.status(200).send(fw);
  } catch (error) {
    return res.status(500).send(error.message);
  }
});

app.post('/v1/firmware', async (req, res) => {
  try {
    await supervisor.updateLock();
    const flashResult = await flasher.flash(req.body.firmwareFile || constants.FIRMWARE_FILE, req.body.bootloaderFile || constants.BOOTLOADER_FILE);
    supervisor.updateUnlock();
    await supervisor.reboot();
    return res.status(200).send(flashResult);
  } catch (error) {
    supervisor.updateUnlock();
    return res.status(500).send(error.message);
  }
});

app.post('/v1/sleep', async (req, res) => {
  if (!req.body.sleepTime || !req.body.sleepDelay) {
    return res.status(400).send("request is missing sleep time and/or sleep delay parameter");
  }
  try {
    const updating = await supervisor.updating();
    debug(`supervisor updating check: ${updating}`);
    if (updating && !req.body.force) {
      return res.status(409).send("device is updating, cannot sleep now unless force parameter is set true");
    }
    const sleepResult = await firmata.sleep(req.body.sleepTime,req.body.sleepDelay);
    return res.status(200).send(sleepResult);
  } catch (error) {
    return res.status(500).send(error.message);
  }
});

app.listen(constants.PORT);