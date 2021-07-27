#!/bin/env node

const debug = require('debug')('firmata');
const SERIAL_PORT = process.env.SERIAL_PORT || "/dev/ttyS0"
const Firmata = require("firmata");
const board = new Firmata(SERIAL_PORT, { skipCapabilities: true });
const balenaSysex = 0x0B;
const balenaSysexSubCommandFirmware = 0x00;
String.prototype.splice = function (idx, rem, str) {
  return this.slice(0, idx) + str + this.slice(idx + Math.abs(rem));
};

class FirmataModule {
  async getVersion() {
    const res = new Promise((resolve, reject) => {
      let data = {
        firmataName: '',
        firmataVersion: '',
        implementationVersion: ''
      };
      const timeout = setTimeout(() => {
        if (data.firmwareName === '' || data.firmataVersion === '' || data.implementationVersion === '') {
          board.clearSysexResponse(balenaSysex);
          debug('firmware metadata cannot be obtained');
          resolve(data);
        }
      }, 10000);
      board.once("queryfirmware", () => {
        data.firmataName = board.firmware.name;
        data.firmataVersion = board.firmware.version.major + "." + board.firmware.version.minor;
        data.implementationVersion = '';
        debug('queryfirmware completed');

        board.clearSysexResponse(balenaSysex);
        board.sysexResponse(balenaSysex, resp => {
          debug('got sysex response');
          clearTimeout(timeout);

          const balenaVersion = String.fromCharCode.apply(null, Firmata.decode(resp));
          debug(`Balena Firmata Version: ${balenaVersion}`);
          data.implementationVersion = balenaVersion;
          resolve(data);

          board.clearSysexResponse(balenaSysex);
        })
        debug('sending sysex command');
        board.sysexCommand([balenaSysex, balenaSysexSubCommandFirmware]);
      });
    });
    debug('Calling queryfirmware');
    board.queryFirmware(() => { });
    return res;
  }

  async sleep(delay, time) {
    board.sysexCommand(this.configSleep(delay, time));
  };

  async setPin(pin, state) {
    board.digitalWrite(pin, state);
  };

  async getPin(pin) {
    board.digitalRead(pin);
  };

  async close() {
    board.transport.close();
  };

  async open() {
    board.transport.open();
  }

  padData(input_string) {
    for (var i = 1; i < 6; i++) {
      input_string = input_string.splice((i * -7) - ((i * 1) - 1), 0, "0");
    }
    return input_string;
  };

  configSleep(delay, sleep) {
    // we want to represent the input as a 8-bytes array
    var byteArray = [0, 0, 0, 0, 0, 0];
    // pad every 8th bit with 0 for conformance with Firmata protocol
    var sleep_string = sleep.toString(2);
    sleep_string = this.padData(sleep_string);
    var sleep_data = parseInt(sleep_string, 2);
    var delay_string = delay.toString(2);
    delay_string = this.padData(delay_string);
    var delay_data = parseInt(delay_string, 2);
    for (var index = 0; index < byteArray.length; index++) {
      var byte = sleep_data & 0xff;
      byteArray[index] = byte;
      sleep_data = (sleep_data - byte) / 256;
    }
    // insert balena command
    byteArray.splice(0, 0, 0x0B);
    // insert balena subcommand
    byteArray.splice(1, 0, 0x01);
    byteArray.splice(2, 0, delay_data);
    return byteArray;
  };

}

module.exports = new FirmataModule();