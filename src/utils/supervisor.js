#!/bin/env node

{
  const debug = require('debug')('supervisor');
  const request = require('request');
  const errors = require('request-promise/errors');
  const rp = require('promise-request-retry');
  const BALENA_SUPERVISOR_ADDRESS = process.env.BALENA_SUPERVISOR_ADDRESS;
  const BALENA_SUPERVISOR_API_KEY = process.env.BALENA_SUPERVISOR_API_KEY;
  const BALENA_APP_ID = process.env.BALENA_APP_ID;

  let self;
  let supervisor = function() {
    'use strict';
    if (!(this instanceof supervisor)) return new supervisor();
    this.supervisor = {};
    self = this;

    this.checkForOngoingUpdate = function() {
      return new Promise((resolve, reject) => {
        let options = {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          json: true,
          retry: 5, // will retry the call twice, in case of error.
          delay: 2000, // will delay retries by 2000 ms.  The default is 100.
          verbose_logging: false, // will log errors only, if set to be true, will log all actions
          factor: 2, // will multiple the delay by the factor each time a retry is attempted.
          uri:
            BALENA_SUPERVISOR_ADDRESS +
            '/v1/device?apikey=' +
            BALENA_SUPERVISOR_API_KEY,
        };
        rp(options)
          .then(function(parsedBody) {
            resolve(parsedBody);
          })
          .catch(errors.StatusCodeError, function(reason) {
            console.log("couldn't reach supervisor, retrying...");
          })
          .catch(errors.RequestError, function(reason) {
            console.error('failing to reach supervisor...', error); // This prints error with stack included (as for normal errors)
          });
      });
    };

    this.shutdown = function() {
      return new Promise((resolve, reject) => {
        let options = {
          method: 'POST',
          uri:
            BALENA_SUPERVISOR_ADDRESS +
            '/v1/shutdown?apikey=' +
            BALENA_SUPERVISOR_API_KEY,
        };
        rp(options)
          .then(function(parsedBody) {
            if (!parsedBody.Error) {
              resolve(parsedBody.Data);
            } else {
              reject(parsedBody.Error);
            }
          })
          .catch(function(err) {
            reject(err);
          });
      });
    };

    this.checkLocalMode = function() {
        return new Promise((resolve, reject) => {
          let options = {
            method: 'GET',
            retry: 5, // will retry the call twice, in case of error.
            delay: 2000, // will delay retries by 2000 ms.  The default is 100.
            verbose_logging: false, // will log errors only, if set to be true, will log all actions
            factor: 2, // will multiple the delay by the factor each time a retry is attempted.
            uri:
              BALENA_SUPERVISOR_ADDRESS +
              '/v2/local/target-state/?apikey=' +
              BALENA_SUPERVISOR_API_KEY,
          };
          rp(options)
            .then(function(parsedBody) {
                resolve(JSON.parse(parsedBody).state.local.config.SUPERVISOR_LOCAL_MODE);
            })
            .catch(function(err) {
              reject(err);
            });
        });
      };

    this.getOverlay = function() {
      return new Promise((resolve, reject) => {
        let options = {
          method: 'GET',
          retry: 5, // will retry the call twice, in case of error.
          delay: 2000, // will delay retries by 2000 ms.  The default is 100.
          verbose_logging: false, // will log errors only, if set to be true, will log all actions
          factor: 2, // will multiple the delay by the factor each time a retry is attempted.
          uri:
            BALENA_SUPERVISOR_ADDRESS +
            '/v2/local/target-state/?apikey=' +
            BALENA_SUPERVISOR_API_KEY,
        };
        rp(options)
          .then(function(parsedBody) {
              resolve(JSON.parse(parsedBody));
          })
          .catch(function(err) {
            reject(err);
          });
      });
    };

    this.setOverlay = function() {
      return new Promise((resolve, reject) => {
        let options = {
          method: 'POST',
          uri:
            BALENA_SUPERVISOR_ADDRESS +
            '/v2/local/target-state/?apikey=' +
            BALENA_SUPERVISOR_API_KEY,
          body: {
            local: {
              config: {
                HOST_CONFIG_core_freq: '250',
                HOST_CONFIG_dtoverlay:
                  '"balena-fin","uart1,txd1_pin=32,rxd1_pin=33"',
              },
            },
          },
          json: true,
        };
        rp(options)
          .then(function(parsedBody) {
            if (!parsedBody.Error) {
              resolve();
            } else {
              resolve(parsedBody.Error);
            }
          })
          .catch(function(err) {
            resolve(err);
          });
      });
    };

    this.stopService = function() {
      return new Promise((resolve, reject) => {
        let options = {
          method: 'POST',
          uri:
            BALENA_SUPERVISOR_ADDRESS +
            '/v2/applications/' +
            BALENA_APP_ID +
            '/stop-service?apikey=' +
            BALENA_SUPERVISOR_API_KEY,
          body: {
            serviceName: 'finabler',
          },
          json: true,
        };
        rp(options)
          .then(function(parsedBody) {
            if (!parsedBody.Error) {
              resolve(parsedBody.Data);
            } else {
              reject(parsedBody.Error);
            }
          })
          .catch(function(err) {
            reject(err);
          });
      });
    };

    this.reboot = function() {
      return new Promise((resolve, reject) => {
        self
          .checkForOngoingUpdate()
          .then(response => {
            let options = {
              method: 'POST',
              uri:
                BALENA_SUPERVISOR_ADDRESS +
                '/v1/reboot?apikey=' +
                BALENA_SUPERVISOR_API_KEY,
            };
            rp(options)
              .then(function(parsedBody) {
                if (!parsedBody.Error) {
                  resolve(parsedBody.Data);
                } else {
                  reject(parsedBody.Error);
                }
              })
              .catch(function(err) {
                reject(err);
              });
          })
          .catch(response => {
            console.error(
              'device is not idle, likely updating, will retry rebooting in 60 seconds',
            );
            setTimeout(self.reboot, 60000);
          });
      });
    };
  };

  module.exports = supervisor();
}
