#!/bin/env node
const fs = require('fs');
const fsp = require('fs').promises;
const download = require('download');
const decompress = require('decompress');
const debug = require('debug')('downloader');

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
};