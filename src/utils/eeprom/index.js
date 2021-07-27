#!/bin/env node

const gi = require('node-gtk');
const sleep = require('sleep-promise');
Fin = gi.require('Fin', '0.2')
const fin = new Fin.Client()

module.exports = class eeprom {

    async info() {
        let data = {};
        try {
            data.revision = await fin.revision;
            data.uid = await fin.uid;
            data.eeprom = await fin.eeprom;
            return data;
        } catch (error) {
            throw error;
        }
    }
}