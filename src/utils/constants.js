#!/bin/env node

module.exports = class Constants {
    constructor() {
        this.DEVICE_NAME = process.env.BALENA_DEVICE_NAME_AT_INIT;
        this.PORT = parseInt(process.env.PORT) || 1337;
        this.AUTOFLASH = parseInt(process.env.AUTOFLASH) || 1;
        this.OPENOCD_DEBUG_LEVEL = parseInt(process.env.OPENOCD_DEBUG_LEVEL) || 2;
        this.FIRMWARE_VERSION = process.env.FIRMWARE_VERSION || '2.0.1';
        this.BOOTLOADER_FILE = process.env.BOOTLOADER_FILE || '/data/firmware/bootloader.s37'
        this.FIRMWARE_URL = `https://github.com/balena-io-hardware/balena-fin-coprocessor-firmata/releases/download/v${this.FIRMWARE_VERSION}/firmata.hex`
        this.FIRMWARE_FOLDER = process.env.FIRMWARE_FOLDER || `/data/firmware/`;
        this.FIRMWARE_NAME = `firmata-v${this.FIRMWARE_VERSION}.hex`; 
        this.FIRMWARE_PATH = `${this.FIRMWARE_FOLDER}${this.FIRMWARE_NAME}`;
    }
};