#!/bin/env node

const debug = require('debug')('flasher');
const Gpio = require('onoff').Gpio;
const mux = new Gpio(41, 'out');
const fs = require('fs');
const fsPromises = require('fs').promises;
const spawn = require('child_process').spawn;
const sleep = require('sleep-promise');
let flashingState = 0;

module.exports = class flasher {
  async flash(fw_file, bl_file) {
    debug(`attempting to flash firmware: ${fw_file} with bootloader: ${bl_file}`);
    if (flashingState) {
      debug(`flashing state: ${flashingState}`);
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
    await sleep(1);
    try {
      const openocd = spawn(`openocd`, ['-f', 'board/balena-fin/balena-fin-v1-1.cfg']);
      openocd.stdout.on('data', (data) => {
        console.log(`openocd stdout: ${data}`);
      });
      
      openocd.stderr.on('data', (data) => {
        console.error(`openocd stderr: ${data}`);
      });
      
      openocd.on('close', (code) => {
        console.log(`openocd child process exited with code ${code}`);
      });
      await sleep(1);
      const telnet = spawn(`telnet`, ['localhost', '4444']);
      telnet.stdout.on('data', (data) => {
        console.log(`telnet stdout: ${data}`);
      });
      
      telnet.stderr.on('data', (data) => {
        console.error(`telnet stderr: ${data}`);
      });
      
      telnet.on('close', (code) => {
        console.log(`telnet child process exited with code ${code}`);
      });
      await sleep(1);
      telnet.stdin.write(`debug_level 2\n`);
      await sleep(1);
      telnet.stdin.write(`reset halt\n`);
      await sleep(1);
      telnet.stdin.write(`program ${bl_file}\n`);
      await sleep(1);
      telnet.stdin.write(`reset halt\n`);
      await sleep(5);
      telnet.stdin.write(`program ${fw_file}\n`);
      await sleep(1);
      telnet.stdin.write(`reset run\n`);
      await sleep(5);
      telnet.stdin.write(`shutdown\n`);
      await sleep(1);
      return await mux.writeSync(0);
    } catch (error) {
      debug(error);
      throw error;
    }
  }
}