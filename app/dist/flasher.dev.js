"use strict";

var Gpio = require('onoff').Gpio;

var mux = new Gpio(41, 'out');

var _require = require("child_process"),
    spawn = _require.spawn;

var cmp = require('semver-compare');

var fs = require('fs');

var flashingInProgress = false;

function newFlasher(finRevision, supervisor, firmata) {
  return {
    flash: function flash(name) {
      return new Promise(function (resolve, reject) {
        fs.access("firmware/".concat(name), fs.F_OK, function (err) {
          if (err) {
            reject(new Error("Firmware ".concat(name, " not found")));
            return;
          }

          if (flashingInProgress) {
            reject(new Error('Flashing is already in progress'));
            return;
          }

          var errorCheck = 0;
          flashingInProgress = true;
          mux.writeSync(1);
          var flash = spawn("/usr/src/app/flash.sh", [name, finRevision]);
          flash.stdout.on('data', function (data) {
            console.log("flash stdout: " + data);
          });
          flash.stderr.on('data', function (data) {
            console.error("flash stderr: " + data);

            if (!data.includes('Connection closed by foreign host.')) {
              errorCheck++;
              reject(new Error("Flashing failed with message: ".concat(data)));
            }
          });
          flash.on('error', function (err) {
            console.error(err);
            errorCheck++;
            reject(err);
          });
          flash.on('close', function () {
            mux.writeSync(0);

            if (errorCheck === 0) {
              resolve();
            } else {
              console.log('flash failed! device will not reboot.');
              errorCheck = 0;
            }
          });
        });
      })["finally"](function () {
        flashingInProgress = false;
      }).then(function () {
        if (finRevision > '09') {
          console.log('rebooting via supervisor...'); // We trigger the reboot, but don't await it.

          supervisor.reboot()["catch"](function (err) {
            console.error('reboot failed with error: ', err);
          });
        }
      });
    },
    flashIfNeeded: function flashIfNeeded(filePath, meta) {
      var _this = this;

      console.log("Target firmware version: [".concat(meta.name, "/").concat(meta.version, "]"));
      return firmata.queryFirmware()["catch"](function () {
        // We cannot query firmware.
        return {
          firmataName: '',
          firmataVersion: ''
        };
      }).then(function (_ref) {
        var currentName = _ref.firmataName,
            currentImplVersion = _ref.implementationVersion;

        if (currentName === '' || cmp(currentImplVersion.substr(1), meta.version.substr(1)) === -1 && currentName === meta.name) {
          // if (currentName !== meta.name || currentImplVersion !== meta.version) {
          console.log("Start automatic flashing: updating from [".concat(currentName, "/").concat(currentImplVersion, "]"));
          return _this.flash(filePath).then(function () {
            return true;
          });
        }

        return false;
      });
    },
    stop: function stop() {
      mux.unexport();
    }
  };
}

module.exports = newFlasher;