#!/bin/env node

const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const dateformat = require('dateformat');

const gi = require('node-gtk');
const Fin = gi.require('Fin', '0.2');
const fin = new Fin.Client();
const BALENA_FIN_REVISION = fin.revision;
const SERVER_PORT = parseInt(process.env.SERVER_PORT) || 1337;

const firmata = require(__dirname + '/utils/firmata.js');
const supervisor = require(__dirname + '/utils/supervisor.js');
const Flasher = require(__dirname + '/flasher.js');

const app = express();
const flasher = Flasher(BALENA_FIN_REVISION, supervisor, firmata);

const balena = require('balena-sdk');

const sdk = balena.fromSharedOptions();
var token = process.env.BALENA_API_KEY || "";
console.log(`Using token ${token}`);
sdk.auth.loginWithToken(token);

var uuid = process.env.BALENA_DEVICE_UUID || "";
console.log(`Using UUID ${uuid}`);
const BALENA_DEVICE_UUID = uuid;

let getFirmware = function() {
  return new Promise((resolve, reject) => {
      var data = firmata.queryFirmware()
      console.log(`returning firmware version ${data}`);
      resolve(data);
  });
};

const setTag = (key, val) => {
	console.log(`setting ${key} to ${val}...`);
	sdk.models.device.tags.set(BALENA_DEVICE_UUID, key, val);
};

const removeTag = (key) => {
  console.log(`removing tag ${key}`);
  sdk.models.device.tags.remove(BALENA_DEVICE_UUID, key);
}

const shutdown = (delay, timeout) => {
  return supervisor.checkForOngoingUpdate()
      .then(() => {
        firmata.sleep(parseInt(delay), parseInt(timeout));
        setTag('cm-power', 'sleeping');
        var parsedDate = new Date()
        var newDate = new Date(parsedDate.getTime() + (1000 * seconds))
        setTag('time-until-awake', dateFormat(newDate, "isoDateTime"))
        return supervisor.shutdown();
      })
      .catch(() => { throw new Error('Device is not Idle, likely updating, will not shutdown'); });
};

let setPin = function(pin,state) {
  return new Promise((resolve, reject) => {
    supervisor.checkForOngoingUpdate().then((response) => {
      firmata.setPin(parseInt(pin), parseInt(state));
      resolve();
    }).catch((response) => {
      reject("coprocessor is not responding...");
    });
  });
};

const errorHandler = (err, req, res, next) => {
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
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.use(errorHandler);

app.post('/v1/flash/:fw', (req, res) => {
  if (!req.params.fw) {
    return res.status(400).send('Bad Request');
  }

  return flasher.flash(req.params.fw)
      .then(() => {
        return res.status(200).send('OK');
      });
});

app.post('/v1/setpin/:pin/:state', (req, res) => {
  if (!req.params.pin || !req.params.state) {
    return res.status(400).send('Bad Request');
  }
  console.log('set ' + req.params.pin + ' to state ' + req.params.state);
  setPin(req.params.pin, req.params.state).then(()=> {
    res.status(200).send('OK');
  }).catch((error) => {
    console.error("device is not responding, check for on-going coprocessor flashing/application updating.");  });
});

app.post('/v1/sleep/:delay/:timeout', (req, res) => {
  if (!req.params.delay || !req.params.timeout) {
    return res.status(400).send('Bad Request');
  }
  if (parseInt(BALENA_FIN_REVISION) < 10) {
    return res.status(405).send('Feature not available on current hardware revision');
  }

  shutdown(req.params.delay, req.params.timeout)
      .then(() => {
        console.error("Sleep command registered, shutting down...");
        res.status(200).send('OK');
      })
      .catch((error) => {
        console.error(`Error registering sleep command: ${error.message}`);
        throw error;
      });
});

app.get('/v1/firmware', (req, res) => {
  getFirmware().then((data) => { 
    res.send(data.implementationVersion);
  });
});

app.listen(SERVER_PORT, () => {
  console.log('balenaFin revision', BALENA_FIN_REVISION);
  console.log('server listening on port ' + SERVER_PORT);
});

process.on('SIGINT', () => {
  flasher.stop();
  process.exit();
});

getFirmware().then((data) => { 
  setTag('copro-firmware', data.implementationVersion);
});
setTag('cm-power', 'awake');
removeTag('time-until-awake');

if (process.env.FLASH_ON_START_FILE) {
  const firmwareFile = process.env.FLASH_ON_START_FILE;
  const firmwareMeta = {
    name: process.env.FLASH_ON_START_NAME,
    version: process.env.FLASH_ON_START_VERSION,
  };

  if (firmwareMeta.name && firmwareMeta.version) {
    console.log(`Automatic flashing is configured using ${firmwareFile}.`);
    flasher.flashIfNeeded(firmwareFile, firmwareMeta)
        .then((flashed) => {
          if (!flashed) {
            console.log('Automatic flashing is skipped: the requested firmware is already flashed.');
          }
        })
        .catch(console.error);
  } else {
    console.log('Bad automatic flash configuration: firmware meta data is not fully provided');
  }
}
