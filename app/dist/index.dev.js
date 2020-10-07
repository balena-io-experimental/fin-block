#!/bin/env node
"use strict";

var express = require('express');

var compression = require('compression');

var bodyParser = require('body-parser');

var dateformat = require('dateformat');

var SerialPort = require('serialport');

var gi = require('node-gtk');

var Fin = gi.require('Fin', '0.2');

var fin = new Fin.Client();
var BALENA_FIN_REVISION = fin.revision;
var port;

if (BALENA_FIN_REVISION === '09') {
  port = process.env.SERIALPORT || "/dev/ttyUSB0";
} else {
  port = process.env.SERIALPORT || "/dev/ttyS0";
}

var SERVER_PORT = parseInt(process.env.SERVER_PORT) || 1337;

var firmata = require(__dirname + '/utils/firmata.js');

var supervisor = require(__dirname + '/utils/supervisor.js');

var Flasher = require(__dirname + '/flasher.js');

var app = express();
var flasher = Flasher(BALENA_FIN_REVISION, supervisor, firmata);

var balena = require('balena-sdk');

var sdk = balena.fromSharedOptions();
var token = process.env.BALENA_API_KEY || "";
console.log("Using token ".concat(token));
sdk.auth.loginWithToken(token);
var uuid = process.env.BALENA_DEVICE_UUID || "";
console.log("Using UUID ".concat(uuid));
var BALENA_DEVICE_UUID = uuid;
var firmwareMeta = {
  name: 'StandardFirmata',
  version: 'v2.0.1'
};

var getFirmware = function getFirmware() {
  return new Promise(function (resolve, reject) {
    firmata.queryFirmware().then(function (data) {
      console.log("returning firmware version ".concat(data.implementationVersion));
      resolve(data);
    })["catch"](function () {
      reject('failed to return firmware version, likely failed flashing.');
    });
  });
};

var setEnv = function setEnv(key, val) {
  console.log("setting envar ".concat(key, " to ").concat(val, "..."));
  sdk.models.device.envVar.set(BALENA_DEVICE_UUID, key, val);
};

var setTag = function setTag(key, val) {
  return new Promise(function (resolve, reject) {
    console.log("setting ".concat(key, " to ").concat(val, "..."));
    sdk.models.device.tags.set(BALENA_DEVICE_UUID, key, val);
    resolve();
  });
};

var shutdown = function shutdown(delay, timeout) {
  return supervisor.checkForOngoingUpdate().then(function () {
    setTag('fin-status', 'sleeping').then(function () {
      var parsedDate = new Date();
      var newDate = new Date(parsedDate.getTime() + 1000 * timeout);
      setTag('time-until-awake', dateFormat(newDate, "isoDateTime")).then(function () {
        firmata.sleep(parseInt(delay), parseInt(timeout));
        return supervisor.shutdown();
      });
    });
  })["catch"](function () {
    throw new Error('Device is not Idle, likely updating, will not shutdown');
  });
};

var getPin = function getPin(pin) {
  return new Promise(function (resolve, reject) {
    supervisor.checkForOngoingUpdate().then(function (response) {
      firmata.getPin(parseInt(pin));
      resolve();
    })["catch"](function (response) {
      reject("coprocessor is not responding...");
    });
  });
};

var setPin = function setPin(pin, state) {
  return new Promise(function (resolve, reject) {
    supervisor.checkForOngoingUpdate().then(function (response) {
      firmata.setPin(parseInt(pin), parseInt(state));
      resolve();
    })["catch"](function (response) {
      reject("coprocessor is not responding...");
    });
  });
};

var errorHandler = function errorHandler(err, req, res, next) {
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
app.post('/v1/flash/:fw', function (req, res) {
  if (!req.params.fw) {
    return res.status(400).send('Bad Request');
  }

  return flasher.flash(req.params.fw).then(function () {
    return res.status(200).send('OK');
  })["catch"](function (err) {
    return res.status(400).send(err.message);
  });
});
app.post('/v1/pin/get/:pin', function (req, res) {
  if (!req.params.pin) {
    return res.status(400).send('Bad Request');
  }

  console.log('get pin ' + req.params.pin + ' state');
  getPin(req.params.pin, req.params.state).then(function (data) {
    res.status(200).send(data);
  })["catch"](function (error) {
    console.error("device is not responding, check for on-going coprocessor flashing/application updating.");
    res.status(400);
  });
});
app.post('/v1/pin/set/:pin/:state', function (req, res) {
  if (!req.params.pin || !req.params.state) {
    return res.status(400).send('Bad Request');
  }

  console.log('set pin ' + req.params.pin + ' to state ' + req.params.state);
  setPin(req.params.pin, req.params.state).then(function () {
    res.status(200).send('OK');
  })["catch"](function (error) {
    console.error("device is not responding, check for on-going coprocessor flashing/application updating.");
  });
});
app.post('/v1/sleep/:delay/:timeout', function (req, res) {
  if (!req.params.delay || !req.params.timeout) {
    return res.status(400).send('Bad Request');
  }

  if (parseInt(BALENA_FIN_REVISION) < 10) {
    return res.status(405).send('Feature not available on current hardware revision');
  }

  shutdown(req.params.delay, req.params.timeout).then(function () {
    console.error("Sleep command registered, shutting down...");
    res.status(200).send('OK');
  })["catch"](function (error) {
    console.error("Error registering sleep command: ".concat(error.message));
    throw error;
  });
});
app.get('/v1/firmware', function (req, res) {
  getFirmware().then(function (data) {
    return res.status(200).send(data.implementationVersion);
  })["catch"](function (error) {
    return res.status(405).send('Firmata is unreachable.');
  });
});
app.listen(SERVER_PORT, function () {
  console.log('balenaFin revision', BALENA_FIN_REVISION);
  console.log('server listening on port ' + SERVER_PORT);
});
process.on('SIGINT', function () {
  flasher.stop();
  process.exit();
});
setTag('fin-status', 'awake');
setTag('time-until-awake', 'N/A');
flasher.flashIfNeeded('firmata-' + (process.env.FIRMATA_VERSION ? process.env.FIRMATA_VERSION : process.env.VERSION) + '.hex', firmwareMeta).then(function (flashed) {
  if (!flashed) {
    console.log('Automatic flashing is skipped: the requested firmware is already flashed.');
  } else {
    setTag('fin-status', 'flashing');
  }
}).then(function () {
  getFirmware().then(function (data) {
    setTag('firmata', data.implementationVersion);
  })["catch"](function (err) {
    console.log(err);
  });
})["catch"](console.error);