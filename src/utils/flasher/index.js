#!/bin/env node

const debug = require('debug')('flasher');
const Gpio = require('onoff').Gpio;
const mux = new Gpio(41, 'out');
const fs = require('fs');
const fsPromises = require('fs').promises;
const {exec, spawn} = require('child_process').spawn;
const sleep = require('sleep-promise');
let flashingState = 0;

class Flasher {
  async flash(hwRev, fw_file, bl_file, verbosity) {
    debug(`attempting to flash firmware: ${fw_file} with bootloader: ${bl_file}`);
    debug(`flashing state: ${flashingState}`);
    if (flashingState) {
      throw new Error('a flash process is already running');
    }
    try {
      await fsPromises.access(fw_file, fs.constants.R_OK | fs.constants.W_OK);
      await fsPromises.access(bl_file, fs.constants.R_OK | fs.constants.W_OK);
    } catch (error) {
      debug(error);
      throw new Error(`missing firmware or bootloader file from filesystem`);
    }
    flashingState = 1;
    await mux.writeSync(1);
    await sleep(1000);
    try {
      debug(`spawning openocd process with debug level set to ${verbosity}...`);
      const openocdConfig = hwRev === 09 ? 'board/balena-fin/balena-fin-v1-0.cfg' : 'board/balena-fin/balena-fin-v1-1.cfg'
      if (hwRev === 09) {
        exec(`ftdi_eeprom --flash-eeprom /usr/src/app/openocd/config/balena-fin-v1.0-jtag.conf`);
        sleep(1000);
      }
      const openocd = spawn(`openocd`, [`-d${verbosity}`, '-f', openocdConfig]);
      openocd.on('close', (code) => {
        debug(`openocd child process exited with code ${code}`);
      });
      await sleep(10000);
      debug(`spawning telnet client process...`);
      const telnet = spawn(`telnet`, ['localhost', '4444']);
      telnet.stdout.on('data', (data) => {
        debug(`telnet stdout: ${data}`);
      });
      telnet.stderr.on('data', (data) => {
        if (data.includes('Error')) {
          throw new Error(data);
        }
        debug(`telnet stderr: ${data}`);
      });
      telnet.on('close', (code) => {
        debug(`telnet child process exited with code ${code}`);
      });
      await sleep(1000);
      telnet.stdin.write(`reset halt\n`);
      await sleep(1000);
      telnet.stdin.write(`program ${bl_file}\n`);
      await sleep(10000);
      telnet.stdin.write(`reset halt\n`);
      await sleep(1000);
      telnet.stdin.write(`program ${fw_file}\n`);
      await sleep(30000);
      telnet.stdin.write(`reset run\n`);
      await sleep(5000);
      telnet.stdin.write(`shutdown\n`);
      flashingState = 0;
      await sleep(5000);
      return await mux.writeSync(0);
    } catch (error) {
      await mux.writeSync(0);
      flashingState = 0;
      debug(error);
      throw error;
    }
  }
}

module.exports = new Flasher();