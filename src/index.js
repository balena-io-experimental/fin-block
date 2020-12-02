#!/bin/env node

const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const dateFormat = require('dateformat');
const gi = require('node-gtk');
const fs = require('fs');
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
const { reject } = require('lodash');

const sdk = balena.fromSharedOptions();
let token = process.env.BALENA_API_KEY || "";
sdk.auth.loginWithToken(token);

let uuid = process.env.BALENA_DEVICE_UUID || "";
const BALENA_DEVICE_UUID = uuid;

process.on("unhandledRejection", (error) => {
  console.error(error); // This prints error with stack included (as for normal errors)
  // throw error; // Following best practices re-throw error and let the process exit with error code
});

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
    console.log(`setting ${key} tag to ${val}...`);
    sdk.models.device.tags.set(BALENA_DEVICE_UUID, key, val)
    .catch((error) => {
      console.log('Error ', error);
      reject();
    });
    resolve();
  });
};

const search = (nameKey, myArray) => {
  for (let i=0; i < myArray.length; i++) {
      if (myArray[i].name === nameKey) {
          return myArray[i].value;
      }
  }
}

const setConfigVars = (required) => {
  return new Promise((resolve, reject) => {
    if(required){
    sdk.models.device.configVar.set(uuid,'BALENA_HOST_CONFIG_core_freq','250')
    .then(() => {
      console.log("BALENA_HOST_CONFIG_core_freq added to config vars");
      sdk.models.device.configVar.set(uuid,'BALENA_HOST_CONFIG_dtoverlay','\"balena-fin\",\"uart1,txd1_pin=32,rxd1_pin=33\"')
      .then(() => {
        console.log("BALENA_HOST_CONFIG_dtoverlay added to config vars");
        resolve(true);
      })
      .catch((error) => {
        console.log('Error ', error);
        reject();
      });
    });
  }
  else{
    resolve(false);
  }
})
.catch(() => {
  reject(err);
});
}

const addConfigVarsIfNeeded = () => {
  return new Promise((resolve, reject) => {
    return supervisor.checkForOngoingUpdate() 
        .then(() => {
            sdk.models.device.configVar.getAllByDevice(uuid)
            .then((vars)=>{
              if(search("BALENA_HOST_CONFIG_core_freq", vars) == '250' && search("BALENA_HOST_CONFIG_dtoverlay", vars) == '"balena-fin","uart1,txd1_pin=32,rxd1_pin=33"'){
                console.log('ConfigVars are set.')
                return false;
              }
              else{
                console.log('ConfigVars are not set.')
                return true;
              }
            })
            .then((check) => {
              return setConfigVars(check)
              .then((result)=>{
                console.log(`Need to reboot supervisor? ${result}`);
                if (result){
                  return supervisor.reboot(() => true);
                }
                else {
                  resolve();
                }
              });
            })
            .catch((error) => {
              console.log('Error ', error);
              reject();
            });
        })       
        .catch((err) => { 
          throw new Error('cannot reach supervisor'); 
        }); 
      });
}

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
      .catch(() => { 
        throw new Error('Device is not Idle, likely updating, will not shutdown'); 
      });
};

let getPin = function(pin) {
  return new Promise((resolve, reject) => {
    supervisor.checkForOngoingUpdate()
    .then((response) => {
      firmata.getPin(parseInt(pin));
      resolve();
    })
    .catch((response) => {
      throw new Error('cannot reach supervisor'); 
      // reject("coprocessor is not responding...");
    });
  });
};

let setPin = function(pin,state) {
  return new Promise((resolve, reject) => {
    supervisor.checkForOngoingUpdate()
    .then((response) => {
      firmata.setPin(parseInt(pin), parseInt(state));
      resolve();
    })
    .catch((response) => {
      throw new Error('cannot reach supervisor'); 

      // reject("coprocessor is not responding...");
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

app.post('/flash/:fw', (req, res) => {
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

app.post('/pin/get/:pin', (req, res) => {
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

app.post('/pin/set/:pin/:state', (req, res) => {
  if (!req.params.pin || !req.params.state) {
    return res.status(400).send('Bad Request');
  }
  console.log('set pin ' + req.params.pin + ' to state ' + req.params.state);
  setPin(req.params.pin, req.params.state).then(()=> {
    res.status(200).send('OK');
  }).catch((error) => {
    console.error("device is not responding, check for on-going coprocessor flashing/application updating.");  });
});

app.post('/sleep/:delay/:timeout', (req, res) => {
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

app.get('/firmware', (req, res) => {
  getFirmware().then((data) => {
    return res.status(200).send(data.implementationVersion)
  })
  .catch((error) => {
    return res.status(405).send('Firmata is unreachable.');
  })    
});

app.get('/ping', (req, res) => {
    return res.status(200).send('OK');
});

app.listen(SERVER_PORT, () => {
  console.log('balenaFin revision', BALENA_FIN_REVISION);
  console.log('server listening on port ' + SERVER_PORT);
});

process.on('SIGINT', () => {
  flasher.stop();
  process.exit();
});

let getVersion = function(revision) {
  return new Promise((resolve, reject) => {
    switch(revision) {
      case '09':
        resolve("v1.0.0");
        break;
      case '10':
        resolve("v1.1.0");
      case '11':
        resolve("v1.1.1");
      default:
        reject("balenaFin version undefined...");;
    } 
  })
};


setTag('fin-status', 'awake');
getVersion(BALENA_FIN_REVISION)
.then((version) => {
  setTag('fin-version', version);
})
.catch((error) => {
  console.log(error);
});
setTag('wake-eta', 'N/A');

addConfigVarsIfNeeded()
.then(() => {
  if(process.env.DEV_MODE == 1){
    let fsTimeout;
    console.log('Entering Dev Mode.');
  
    fs.watch('/data/firmware/', function (event, filename) {
      if (!fsTimeout) {
          if (filename.includes(".hex") && fs.existsSync(`/data/firmware/${filename}`)) {
              flasher.flash(filename)
              .then(console.log('Rebooting now...'))
              .catch((err) => {console.log(err)})
          }
          fsTimeout = setTimeout(function() { fsTimeout=null }, 1000) // give 1 second for multiple events
      }
    });
  }
  else {
    flasher.flashIfNeeded('firmata-' + (process.env.SELECTED_VERSION) +'.hex', {name:'StandardFirmata',version: process.env.SELECTED_VERSION})
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
      .then(() => {
        if(process.env.ONE_SHOT == 1){
          return supervisor.stopService()
          .then(() => {
            console.log("ONE_SHOT enabled. Stopping container...")
          })
          .catch(() => {
            console.log(err)
          })
        }
      })
      .catch((err) => {
        console.log(err)
      })
    }
    )
    .catch(console.error);
  }
})


