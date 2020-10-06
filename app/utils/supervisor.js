#!/bin/env node

{
  const debug = require('debug')('supervisor');
  const request = require('request');
  const rp = require('request-promise-native');
  const BALENA_SUPERVISOR_ADDRESS = process.env.BALENA_SUPERVISOR_ADDRESS;
  const BALENA_SUPERVISOR_API_KEY = process.env.BALENA_SUPERVISOR_API_KEY;
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
            'Content-Type': 'application/json'
          },
          json: true,
          uri: BALENA_SUPERVISOR_ADDRESS + '/v1/device?apikey=' + BALENA_SUPERVISOR_API_KEY
        };
        rp(options)
          .then(function(parsedBody) {
            debug(parsedBody);
            if (parsedBody.status === "Idle") {
              resolve(parsedBody);
            } else {
              reject(parsedBody);
            }

          })
          .catch(function(err) {
            reject(err);
          });
      });
    };

    this.shutdown = function() {
      return new Promise((resolve, reject) => {
        let options = {
          method: 'POST',
          uri: BALENA_SUPERVISOR_ADDRESS + '/v1/shutdown?apikey=' + BALENA_SUPERVISOR_API_KEY
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
        self.checkForOngoingUpdate().then((response) => {
          let options = {
            method: 'POST',
            uri: BALENA_SUPERVISOR_ADDRESS + '/v1/reboot?apikey=' + BALENA_SUPERVISOR_API_KEY
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
        }).catch((response) => {
          console.error("Device is not Idle, likely updating, will retry rebooting in 60 seconds");
          setTimeout(self.reboot, 60000);
        });
      });
    };
  };

  module.exports = supervisor();
}
