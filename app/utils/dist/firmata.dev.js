#!/bin/env node
"use strict";

{
  var gi = require('node-gtk');

  Fin = gi.require('Fin', '0.2');
  var fin = new Fin.Client();
  var BALENA_FIN_REVISION = fin.revision;

  var Firmata = require("firmata");

  var port;

  if (BALENA_FIN_REVISION === '09') {
    port = process.env.SERIALPORT || "/dev/ttyUSB0";
  } else {
    port = process.env.SERIALPORT || "/dev/ttyS0";
  }

  var board = new Firmata(port, {
    skipCapabilities: true
  });

  var debug = require('debug')('firmata');

  String.prototype.splice = function (idx, rem, str) {
    return this.slice(0, idx) + str + this.slice(idx + Math.abs(rem));
  };

  var balenaSysex = 0x0B;
  var balenaSysexSubCommandFirmware = 0x00;
  var self;

  var firmata = function firmata() {
    'use strict';

    if (!(this instanceof firmata)) return new firmata();
    this.firmata = {};
    self = this;

    this.configSleep = function (delay, sleep) {
      // we want to represent the input as a 8-bytes array
      var byteArray = [0, 0, 0, 0, 0, 0]; // pad every 8th bit with 0 for conformance with Firmata protocol

      var sleep_string = sleep.toString(2);
      sleep_string = self.padData(sleep_string);
      var sleep_data = parseInt(sleep_string, 2);
      var delay_string = delay.toString(2);
      delay_string = self.padData(delay_string);
      var delay_data = parseInt(delay_string, 2);

      for (var index = 0; index < byteArray.length; index++) {
        var _byte = sleep_data & 0xff;

        byteArray[index] = _byte;
        sleep_data = (sleep_data - _byte) / 256;
      } // insert balena command


      byteArray.splice(0, 0, 0x0B); // insert balena subcommand

      byteArray.splice(1, 0, 0x01);
      byteArray.splice(2, 0, delay_data);
      return byteArray;
    };

    this.setPin = function (pin, state) {
      board.digitalWrite(pin, state);
    };

    this.getPin = function (pin) {
      return board.digitalRead(pin);
    };

    this.padData = function (input_string) {
      for (var i = 1; i < 6; i++) {
        input_string = input_string.splice(i * -7 - (i * 1 - 1), 0, "0");
      }

      return input_string;
    };

    this.sleep = function (delay, timeout) {
      board.sysexCommand(self.configSleep(delay, timeout));
    };

    this.close = function () {
      board.transport.close();
    };

    this.queryFirmware = function () {
      var res = new Promise(function (resolve, reject) {
        var data;
        var timeout = setTimeout(function () {
          if (!data) {
            board.clearSysexResponse(balenaSysex);
            reject(new Error('firmware metadata cannot be obtained'));
          }
        }, 10000);
        board.on("queryfirmware", function () {
          data = {
            firmataName: board.firmware.name,
            firmataVersion: board.firmware.version.major + "." + board.firmware.version.minor,
            implementationVersion: ''
          };
          debug('queryfirmware completed');
          board.clearSysexResponse(balenaSysex);
          board.sysexResponse(balenaSysex, function (resp) {
            debug('got sysex response');
            clearTimeout(timeout);
            var balenaVersion = String.fromCharCode.apply(null, Firmata.decode(resp));
            debug("Balena Firmata Version: ".concat(balenaVersion));
            data.implementationVersion = balenaVersion;
            resolve(data);
            board.clearSysexResponse(balenaSysex);
          });
          debug('sending sysex command');
          board.sysexCommand([balenaSysex, balenaSysexSubCommandFirmware]);
        });
      });
      debug('Calling queryfirmware');
      board.queryFirmware(function () {});
      return res;
    };
  };

  module.exports = firmata();
}