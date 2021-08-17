#!/bin/env node

const debug = require('debug')('eeprom');
const util = require("util");
const exec = util.promisify(require("child_process").exec);

class Eeprom {

    async info() {
        try {
            const serial = await this.readSerial();
            const data = await this.parseSerial(serial);
            const hasFtdi = await this.checkForFtdiChip();
            debug(hasFtdi);
            if (!data.hardwareRevision && hasFtdi) {
                data.hardwareRevision = 9;
                debug(`EEPROM is not flashed, assuming hw revision 09 based on the presence of the FTDI chip FT2232C (present only on hw rev 09)`)
            }
            if (!data.hardwareRevision && !hasFtdi) {
                data.hardwareRevision = 11;
                debug(`EEPROM is not flashed, assuming hw revision 11 based on the absence of the FTDI chip FT2232C (present only on hw rev 09)`)
            }
            debug(data);
            return data;
        } catch (error) {
            throw error;
        }
    }

    async writeSerial(serial) {
        if (!serial || serial.length != 21) {
            throw new Error('invalid serial');
        }
        try {
            const { stdout, stderr } = await exec(
                `echo "${serial}" | ethtool -E eth0 magic 0x9500 offset 0x27 length 22`
            );
            debug(`writeSerial stdout: ${stdout}`);
            debug(`writeSerial stderr: ${stderr}`);
            return stdout;
        } catch (error) {
            throw error;
        }
    }

    async readSerial() {
        try {
            const { stdout, stderr } = await exec(
                `ethtool -e eth0 offset 0x27 length 21 raw on`
            );
            debug(`readSerial stdout: ${stdout}`);
            debug(`readSerial stderr: ${stderr}`);
            return stdout;
        } catch (error) {
            throw error;
        }
    }

    async parseSerial(serial) {
        let data = {};
        switch (serial.length) {
            case 20:
                data = {
                    schema: 0,
                    hardwareRevision: parseInt(serial.substr(0, 2)),
                    batchSerial: parseInt(serial.substr(2, 5)),
                    week: parseInt(serial.substr(7, 2)),
                    year: parseInt(serial.substr(9, 2)),
                    pcbaLot: serial.substr(11, 9),
                    RAW: serial,
                };
                return data;
            case 21:
                data = {
                    schema: parseInt(serial.substr(0, 1)),
                    hardwareRevision: parseInt(serial.substr(1, 2)),
                    batchSerial: parseInt(serial.substr(3, 5)),
                    week: parseInt(serial.substr(8, 2)),
                    year: parseInt(serial.substr(10, 2)),
                    pcbaLot: serial.substr(12, 9),
                    RAW: serial
                };
                return data;
            default:
                throw new Error(`bad serial: ${serial}`);
        }
    }

    async convertRevisionToVersion(hardwareRevision) {
        switch (hardwareRevision) {
            case 9:
                return "1.0.0"
            case 10:
                return "1.1.0"
            case 11:
                return "1.1.1"
            default:
                throw new Error(`hardware revision ${hardwareRevision} unknown, cannot convert to version`);
        }

    }

    async checkForFtdiChip() {
        try {
            const { stdout, stderr } = await exec(
                `lsusb`
            );
            debug(`FTDI chip check stdout: ${stdout}`);
            debug(`FTDI chip check stderr: ${stderr}`);
            return await stdout.includes('FT2232C');
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new Eeprom();