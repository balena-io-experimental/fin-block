#!/bin/env node
const fs = require('fs');
const fsp = require('fs').promises;
const download = require('download');
const decompress = require('decompress');
const debug = require('debug')('downloader');
const request = require('request');
const errors = require('request-promise/errors');
const rp = require('promise-request-retry');

module.exports = class downloader {

    async downloadFirmware(version, url, folder) {
        const downloadUrl = `${url}v${version}/firmata.hex`;
        const destination = `${folder}firmata-v${version}.hex`;
        debug(`downloading firmware file ${downloadUrl} as file ${destination}`);
        try {
            if (fs.existsSync(destination)) {
                debug(`${destination} exists already, skipping download...`);
            } else {
                await download(downloadUrl, folder, {
                    filename: `firmata-v${version}.hex`,
                    decompress: true
                });
            }
            return destination;
        } catch (error) {
            throw error;
        }
    }

    async getlatestFirmwareVersion() {
        const options = {
          method: 'GET',
          uri: `https://api.github.com/repos/balena-io/balena-fin-coprocessor-firmata/releases/latest`,
          headers: {
            'User-Agent': 'request'
          },
          json: true
        };
        try {
            const response = await rp(options);
            const version = response.tag_name.replace('v', '');
            debug(`latest firmware version tag found is ${version}`);
            return version;
        } catch (error) {
            throw error;
        }
      }
};