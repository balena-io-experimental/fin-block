#!/bin/env node

{
    const debug = require('debug')('api');
    const request = require('request');
    const rp = require('request-promise-native');
    const BALENA_API_KEY = process.env.BALENA_API_KEY;
    const BALENA_DEVICE_UUID = process.env.BALENA_DEVICE_UUID;
    let self;
    let api = function() {
      'use strict';
      if (!(this instanceof api)) return new api();
      this.api = {};
      self = this;

      this.setFirmwareEnv = function(firmwareName) {
        return new Promise((resolve, reject) => {
            let options = {
              method: 'POST',
              uri: 'https://api.balena-cloud.com/v5/device_environment_variable?apikey=' + BALENA_API_KEY,
              body: {
                  device: BALENA_DEVICE_UUID,
                  name: 'FIRMWARE',
                  value: firmwareName
              },
              json: true
            };
            rp(options)
              .then(function(parsedBody) {
                  console.log('requested.')
                if (!parsedBody.Error) {
                  resolve(parsedBody.Data);
                } else {
                  reject(parsedBody.Error);
                }
              })
              .catch(function(err) {
                console.log(BALENA_API_KEY)
                console.log(firmwareName)
                reject(err);
              });
          });
      };

      this.getDevice = function() {
        return new Promise((resolve, reject) => {
            let options = {
              method: 'POST',
              uri: `https://api.balena-cloud.com/v5/device?\$filter=uuid%20eq%20'${BALENA_DEVICE_UUID}'`,
              body: {
                  'device': BALENA_DEVICE_UUID,
                  'name': 'FIRMWARE',
                  'value': firmwareName
              },
              json: true,
              auth: {
                'bearer': BALENA_API_KEY
            }
            };
            rp(options)
              .then(function(parsedBody) {
                  console.log('requested.')
                if (!parsedBody.Error) {
                  resolve(parsedBody.Data);
                } else {
                  reject(parsedBody.Error);
                }
              })
              .catch(function(err) {
                console.log(BALENA_API_KEY)
                console.log(firmwareName)
                reject(err);
              });
          });
      };

    };
  
    module.exports = api();
  }