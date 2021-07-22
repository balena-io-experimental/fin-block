#!/bin/env node
const fs = require('fs');
const fsp = require('fs').promises;
const download = require('download');
const decompress = require('decompress');
const debug = require('debug')('downloader');
const FIRMWARE_VERSION = process.env.FIRMWARE_VERSION || `2.0.1`;
const FIRMWARE_URL = `https://github.com/balena-io-hardware/balena-fin-coprocessor-firmata/releases/download/v${FIRMWARE_VERSION}/firmata.hex`
const FIRMWARE_FOLDER = process.env.FIRMWARE_FOLDER || `/data/firmware/`;
const FIRMWARE_NAME = `firmata-v${FIRMWARE_VERSION}.hex`; 
const FIRMWARE_PATH = `${FIRMWARE_FOLDER}/${FIRMWARE_NAME}`;

module.exports = class downloader {

    async downloadFirmware() {
        if (fs.existsSync(FIRMWARE_PATH)) {
            debug(`${FIRMWARE_PATH} exists already, skipping download...`);
        } else {
            return await download(FIRMWARE_URL, FIRMWARE_PATH, {
                filename: FIRMWARE_NAME,
                decompress: true
            });
        }
    }

};