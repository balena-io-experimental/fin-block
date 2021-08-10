#!/bin/env node

const { getSdk } = require('balena-sdk');
const sdk = getSdk();
const BALENA_API_KEY = process.env.BALENA_API_KEY;
const BALENA_DEVICE_UUID = process.env.BALENA_DEVICE_UUID;
const debug = require('debug')('cloud');
module.exports = class BalenaCloud {

    async tag(name, value) {
        try {
            await sdk.auth.logout();
            await sdk.auth.loginWithToken(BALENA_API_KEY);
            return await sdk.models.device.tags.set(BALENA_DEVICE_UUID, name, value);
        } catch (error) {
            debug(error); // we don't want a tag failure to stop flashing/sleeping (ie no internet connectivity when going to sleep)
        }
    }

    async checkAndSetConfigVars() {
        try {
            await sdk.auth.logout();
            await sdk.auth.loginWithToken(BALENA_API_KEY);
            const dtoverlay =  await sdk.models.device.configVar.get(BALENA_DEVICE_UUID, 'BALENA_HOST_CONFIG_dtoverlay');
            const coreFreq =  await sdk.models.device.configVar.get(BALENA_DEVICE_UUID, 'BALENA_HOST_CONFIG_core_freq');
            const dtparam =  await sdk.models.device.configVar.get(BALENA_DEVICE_UUID, 'BALENA_HOST_CONFIG_dtparam');
            if (dtoverlay.contains("balena-fin") && dtoverlay.contains("uart1,txd1_pin=32,rxd1_pin=33")) {
                debug(`dtoverlay settings already match requirements`);
            } else {
                debug(`dtoverlay settings do not match requirements`);
            }
            if (coreFreq === "250") {
                debug(`core_freq settings already match requirements`);
            } else {
                debug(`core_freq settings do not match requirements`);
            }
        } catch (error) {
            throw error;
        }
    }

}