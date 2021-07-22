#!/bin/env node

module.exports = class Constants {
    constructor() {
        this.DEVICE_NAME = process.env.BALENA_DEVICE_NAME_AT_INIT;
        this.PORT = parseInt(process.env.PORT) || 1337;
        this.FIRMWARE_VERSION = process.env.FIRMWARE_VERSION || 'v2.0.1';
        this.FIRMWARE_FILE = process.env.FIRMWARE_FILE || '/data/firmware/firmata-v2.0.1.hex'
        this.BOOTLOADER_FILE = process.env.BOOTLOADER_FILE || '/data/firmware/bootloader.s37'
    }
};