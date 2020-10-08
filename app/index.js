#!/bin/env node

const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const dateFormat = require('dateformat');
const gi = require('node-gtk');
const Fin = gi.require('Fin', '0.2');
const fin = new Fin.Client();
const BALENA_FIN_REVISION = fin.revision;
let port;
if (BALENA_FIN_REVISION === '09') {
  port = process.env.SERIALPORT || "/dev/ttyUSB0";
} else {
  port = process.env.SERIALPORT || "/dev/ttyS0";
}
const SERVER_PORT = parseInt(process.env.SERVER_PORT) || 1337;

const firmata = require(__dirname + '/utils/firmata.js');
const supervisor = require(__dirname + '/utils/supervisor.js');
const Flasher = require(__dirname + '/flasher.js');

const app = express();
const flasher = Flasher(BALENA_FIN_REVISION, supervisor, firmata);

const balena = require('balena-sdk');

const sdk = balena.fromSharedOptions();
let token = process.env.BALENA_API_KEY || "";
sdk.auth.loginWithToken(token);

let uuid = process.env.BALENA_DEVICE_UUID || "";
const BALENA_DEVICE_UUID = uuid;

let firmwareMeta = {name:'StandardFirmata',version:'v2.0.1'};

let getFirmware = function() {
  return new Promise((resolve, reject) => {
      firmata.queryFirmware()
      .then((data) => {
        console.log(`returning firmware version ${data.implementationVersion}`);
        resolve(data);
      })
      .catch(() => {
        reject('failed to return firmware version, likely failed flashing.');
      })
  });
};

const setTag = (key, val) => {
  return new Promise((resolve, reject) => {
    console.log(`setting ${key} to ${val}...`);
    sdk.models.device.tags.set(BALENA_DEVICE_UUID, key, val);
    resolve();
  });
};

const shutdown = (delay, timeout) => {
  return supervisor.checkForOngoingUpdate()
      .then(() => {
        setTag('fin-status', 'sleeping').then(() => {
          var parsedDate = new Date()
          var newDate = new Date(parsedDate.getTime() + (1000 * timeout))
          setTag('wake-eta', dateFormat(newDate, "isoDateTime")).then(() => {
            firmata.sleep(parseInt(delay), parseInt(timeout));
            return supervisor.shutdown();
          });
        });
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

app.post('/v1/firmata/:bool', (req, res) => {
  if(req.params.bool === 'true'){
    firmata.open();
  }
  else if(req.params.bool === 'false'){
    firmata.close();
  }
  else {
    return res.status(400).send('Bad Request');
  }
  return res.status(200);
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

setTag('fin-status', 'awake');
setTag('wake-eta', 'N/A');

flasher.flashIfNeeded('firmata-v' + ((process.env.FIRMATA_VERSION) ? process.env.FIRMATA_VERSION : process.env.DEFAULT_VERSION) +'.hex', firmwareMeta)
.then((flashed) => {
  if (!flashed) {
    console.log('Automatic flashing is skipped: the requested firmware is already flashed.');
  }
  else {
    setTag('fin-status', 'flashing');
  }
})
.then(() => {
  getFirmware()
  .then((data) => {
    setTag('firmata', data.implementationVersion);
  })
  .catch((err) => {
    console.log(err)
  })
}
)
.catch(console.error);
