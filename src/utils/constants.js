#!/bin/env node

module.exports = class Constants {
    constructor() {
        this.DEVICE_NAME = process.env.BALENA_DEVICE_NAME_AT_INIT;
        this.PORT = parseInt(process.env.PORT) || 1337;
        this.AUTOFLASH = parseInt(process.env.AUTOFLASH) || 0;
        this.AUTOCONFIG = parseInt(process.env.AUTOCONFIG) || 0;
        this.OPENOCD_DEBUG_LEVEL = parseInt(process.env.OPENOCD_DEBUG_LEVEL) || 2;
        this.FIRMWARE_VERSION = process.env.FIRMWARE_VERSION || 'latest';
        this.BOOTLOADER_FILE = process.env.BOOTLOADER_FILE || '/data/firmware/bootloader.s37';
        this.FIRMWARE_URL = process.env.FIRMWARE_URL || `https://github.com/balena-io-hardware/balena-fin-coprocessor-firmata/releases/download/`;
        this.FIRMWARE_FOLDER = process.env.FIRMWARE_FOLDER || `/data/firmware/`;
        this.DEFAULT_PIN_MAP_FILE = process.env.DEFAULT_PIN_MAP_FILE || `/usr/src/app/utils/pinmap.json`;
        this.mfgKeyHash = '$2b$10$dSmJ2k9Uuyu4AglhbRnu0uUnKAmeruexzUielBsr0fMwP./ax.OQy';
    }
};