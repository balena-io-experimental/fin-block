#!/usr/bin/env node

const gi = require('node-gtk');
Fin = gi.require('Fin', '0.2');
const fin = new Fin.Client();
const BALENA_FIN_REVISION = fin.revision;
const firmata = require("firmata");
const repl = require("repl");

let port;
if (BALENA_FIN_REVISION === '09') {
  port = process.env.SERIALPORT || "/dev/ttyUSB0";
} else {
  port = process.env.SERIALPORT || "/dev/ttyS0";
}

const board = new firmata.Board('/', () => {
    console.log(`Successfully Connected to ${port}`);
    repl.start("firmata>").context.board = board;
});
