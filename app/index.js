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
let token = process.env.BALENA_API_KEY || "";
console.log(`Using token ${token}`);
sdk.auth.loginWithToken(token);

let uuid = process.env.BALENA_DEVICE_UUID || "";
console.log(`Using UUID ${uuid}`);
const BALENA_DEVICE_UUID = uuid;

let firmwareMeta = {name:'StandardFirmata',version:'v2.0.1'};

let getFirmware = function() {
  return new Promise((resolve, reject) => {
      var data = firmata.queryFirmware()
      .then(() => {
        console.log(`returning firmware version ${data}`);
        resolve(data);
      })
      .catch(() => {
        reject(data)
      })
  });
};

const setEnv = (key, val) => {
	console.log(`setting ${key} to ${val}...`);
	sdk.models.device.envVar.set(BALENA_DEVICE_UUID, key, val);
};

const removeEnv = (key) => {
  console.log(`removing tag ${key}`);
	sdk.models.device.envVar.set(BALENA_DEVICE_UUID, key);
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

let getPin = function(pin) {
  return new Promise((resolve, reject) => {
    supervisor.checkForOngoingUpdate().then((response) => {
      firmata.getPin(parseInt(pin));
      resolve();
    }).catch((response) => {
      reject("coprocessor is not responding...");
    });
  });
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
      })
      .catch((err) => {
        return res.status(400).send(err.message);
      });
});

app.post('/v1/pin/get/:pin', (req, res) => {
  if (!req.params.pin) {
    return res.status(400).send('Bad Request');
  }
  console.log('get pin ' + req.params.pin + ' state');
  getPin(req.params.pin, req.params.state).then((data)=> {
    res.status(200).send(data);
  }).catch((error) => {
    console.error("device is not responding, check for on-going coprocessor flashing/application updating.");  
    res.status(400);
  });
});

app.post('/v1/pin/set/:pin/:state', (req, res) => {
  if (!req.params.pin || !req.params.state) {
    return res.status(400).send('Bad Request');
  }
  console.log('set pin ' + req.params.pin + ' to state ' + req.params.state);
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
    return res.status(200).send(data.implementationVersion)
  })
  .catch((error) => {
    return res.status(405).send('Firmata is unreachable.');
  })    
});

app.listen(SERVER_PORT, () => {
  console.log('balenaFin revision', BALENA_FIN_REVISION);
  console.log('server listening on port ' + SERVER_PORT);
});

process.on('SIGINT', () => {
  flasher.stop();
  process.exit();
});

// getFirmware().then((data) => { 
//   setTag('copro-firmware', data.implementationVersion);
// });
// setTag('cm-power', 'awake');
// removeTag('time-until-awake');

firmata.queryFirmware()
.then((data)=>{
  console.log(`${data.firmataName} @ ${data.implementationVersion}`)
  if(process.env.FIRMATA_NAME & process.env.FIRMATA_VERSION){
    firmwareMeta = {name: process.env.FIRMATA_NAME, version: process.env.FIRMATA_VERSION};
  };
})
.catch(console.error)
.then(() => {
  flasher.flashIfNeeded('firmata.hex', firmwareMeta)
  .then((flashed) => {
    if (!flashed) {
      console.log('Automatic flashing is skipped: the requested firmware is already flashed.');
    }
    if(!process.env.FIRMATA_NAME & !process.env.FIRMATA_VERSION){
      setEnv('FIRMATA_NAME',firmwareMeta.name);
      setEnv('FIRMATA_VERSION',firmwareMeta.version);
    }
    setTag('copro-firmware', data.implementationVersion);
  })
  .catch(console.error);
});

// if (!process.env.FIRMWARE) {
//   const firmwareFile = process.env.FLASH_ON_START_FILE;
//   const firmwareMeta = {
//     name: 'firmata.hex',
//     version: '2.0.1',
//   };

//     if (firmwareMeta.name && firmwareMeta.version) {
//       console.log(`Automatic flashing is configured using ${firmwareFile}.`);
//       flasher.flashIfNeeded(firmwareFile, firmwareMeta)
//           .then((flashed) => {
//             if (!flashed) {
//               console.log('Automatic flashing is skipped: the requested firmware is already flashed.');
//             }
//             setEnv('FIRMATA_NAME',firmwareMeta.name);
//             setEnv('FIRMATA_VERSION',firmwareMeta.version);
//           })
//           .catch(console.error);
//     } else {
//       console.log('Bad automatic flash configuration: firmware meta data is not fully provided');
//     }
// }
