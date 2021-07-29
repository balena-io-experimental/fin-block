#!/bin/env node

const { getSdk } = require('balena-sdk');
const sdk = getSdk();
const BALENA_API_KEY = process.env.BALENA_API_KEY;
const BALENA_DEVICE_UUID = process.env.BALENA_DEVICE_UUID;
module.exports = class BalenaCloud {

    async tag(name, value) {
        await sdk.auth.logout();
        await sdk.auth.loginWithToken(BALENA_API_KEY);
        return await sdk.models.device.tags.set(BALENA_DEVICE_UUID, name, value);
    }
    
}