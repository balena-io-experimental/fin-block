#!/bin/env node

const debug = require('debug')('usb');
const util = require("util");
const exec = util.promisify(require("child_process").exec);

class Usb {

    async info() {
        try {
            const { stdout, stderr } = await exec(
                `uhubctl`,
            );
            debug(`uhubctl stdout: ${stdout}`);
            debug(`uhubctl stderr: ${stderr}`);
            return stdout;
        } catch (error) {
            throw error;
        }
    }

    async set(mode, port, delay = 0) {
        const supported = ['on', 'off', 'toggle', 'cycle']
        if (!supported.includes(mode)) {
            throw new Error('invalid uhubctl mode');
        }
        try {
            const { stdout, stderr } = await exec(
                `uhubctl -a ${mode} -p ${port} -l 1-1 -d ${delay}`,
            );
            debug(`uhubctl stdout: ${stdout}`);
            debug(`uhubctl stderr: ${stderr}`);
            return stdout;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new Usb();