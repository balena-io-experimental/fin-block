#!/bin/env node
const fs = require('fs');
const fsp = require('fs').promises;
const download = require('download');
const decompress = require('decompress');
const debug = require('debug')('downloader');

module.exports = class downloader {

    async downloadFirmware(url,path,name) {
        if (fs.existsSync(path)) {
            debug(`${path} exists already, skipping download...`);
        } else {
            return await download(url, path, {
                filename: name,
                decompress: true
            });
        }
    }

};