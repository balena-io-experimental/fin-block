const Gpio = require('onoff').Gpio;
const mux = new Gpio(41, 'out');
const { spawn } = require("child_process");

let flashingInProgress = false;

function newFlasher(finRevision, supervisor, firmata) {
  return {
    flash: function (name) {
      return new Promise((resolve, reject) => {
        if (flashingInProgress) {
          reject(new Error('Flashing is already in progress'));
          return;
        }

        let errorCheck = 0;

        flashingInProgress = true;
        mux.writeSync(1);
        const flash = spawn("/usr/src/app/flash.sh", [name, finRevision]);

        flash.stdout.on('data', (data) => {
          console.log("flash stdout: " + data);
        });

        flash.stderr.on('data', (data) => {
          console.error("flash stderr: " + data);

          if (!data.includes('Connection closed by foreign host.')) {
            errorCheck++;
            reject(new Error(`Flashing failed with message: ${data}`));
          }
        });

        flash.on('error', (err) => {
          console.error(err);
          errorCheck++;
          reject(err);
        });

        flash.on('close', () => {
          mux.writeSync(0);

          if (errorCheck === 0) {
            resolve();
          } else {
            console.log('flash failed! device will not reboot.');
            errorCheck = 0;
          }
        });
      })
          .finally(() => {
            flashingInProgress = false;
          })
          .then(() => {
            if (finRevision > '09') {
              console.log('rebooting via supervisor...');
              // We trigger the reboot, but don't await it.
              supervisor.reboot()
                  .catch((err) => {
                    console.error('reboot failed with error: ', err);
                  });
            }
          });
    },

    flashIfNeeded: function (filePath, meta) {
      console.log(`Target firmware version: [${meta.name}/${meta.version}]`);
      return firmata.queryFirmware()
          .catch(() => {
            // We cannot query firmware.
            return { firmataName: '', firmataVersion: '' };
          })
          .then(({ firmataName: currentName, implementationVersion: currentImplVersion }) => {
            if (currentName !== meta.name || currentImplVersion !== meta.version) {
              console.log(`Start automatic flashing: updating from [${currentName}/${currentImplVersion}]`);
              return this.flash(filePath).then(() => true);
            }
            return false;
          });
    },

    stop: function () {
      mux.unexport();
    }
  };
}

module.exports = newFlasher;
