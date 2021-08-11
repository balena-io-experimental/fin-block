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
            let needsDtoverlaySettings = 0
            await sdk.auth.logout();
            await sdk.auth.loginWithToken(BALENA_API_KEY);
            let dtoverlay =  await sdk.models.device.configVar.get(BALENA_DEVICE_UUID, 'BALENA_HOST_CONFIG_dtoverlay');
            debug(`current dtoverlay settings: ${dtoverlay}`);
            const coreFreq =  await sdk.models.device.configVar.get(BALENA_DEVICE_UUID, 'BALENA_HOST_CONFIG_core_freq');
            debug(`current core_freq settings: ${coreFreq}`);
            if (dtoverlay.contains("balena-fin")) {
                debug(`dtoverlay already has expected balena-fin value`);
            } else {
                dtoverlaySettings++;
                debug(`dtoverlay is missing expected balena-fin value`);
                dtoverlay.concat(`${dtoverlay.length > 0 ? ',"balena-fin"' : '"balena-fin"'}`);
            }
            if (dtoverlay.contains("uart1,txd1_pin=32,rxd1_pin=33")) {
                debug(`dtoverlay already has expected uart1 value`);
            } else {
                dtoverlaySettings++;
                debug(`dtoverlay is missing expected uart1 value`);
                dtoverlay.concat(`${dtoverlay.length > 0 ? ',"uart1,txd1_pin=32,rxd1_pin=33"' : '"uart1,txd1_pin=32,rxd1_pin=33"'}`);
            }
            if (needsDtoverlaySettings) {
                debug(`setting dtoverlay to ${dtoverlay}`)
                await sdk.models.device.configVar.set(BALENA_DEVICE_UUID, 'BALENA_HOST_CONFIG_dtoverlay', dtoverlay);
            }
            if (coreFreq === "250") {
                debug(`core_freq settings already match expected 250 value`);
            } else {
                debug(`core_freq settings do not match expected 250 value`);
                await sdk.models.device.configVar.set(BALENA_DEVICE_UUID, 'BALENA_HOST_CONFIG_core_freq', "250");
            }
        } catch (error) {
            throw error;
        }
    }

}