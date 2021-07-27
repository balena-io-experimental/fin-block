#!/bin/env node

const debug = require('debug')('supervisor');
const util = require("util");
const lock = util.promisify(require('lockfile').lock);
const unlock = util.promisify(require('lockfile').unlock);
const request = require('request');
const errors = require('request-promise/errors');
const rp = require('promise-request-retry');
const BALENA_SUPERVISOR_ADDRESS = process.env.BALENA_SUPERVISOR_ADDRESS;
const BALENA_SUPERVISOR_API_KEY = process.env.BALENA_SUPERVISOR_API_KEY;
const SUP_RETRY = parseInt(process.env.SUP_RETRY) || 5;
const SUP_DELAY = parseInt(process.env.SUP_DELAY) || 5000;
const SUP_VERBOSE = parseInt(process.env.SUP_VERBOSE) || 1;
const SUP_FACTOR = parseInt(process.env.SUP_FACTOR) || 3;

module.exports = class supervisor {
  async updateLock() {
    try {
      debug('setting lockfile...')
      await lock('/tmp/balena/updates.lock');
    } catch (error) {
      debug("lockfile already set, skipping");
    }
    return true;
  }

  async updateUnlock() {
    try {
      debug('releasing lockfile...')
      await unlock('/tmp/balena/updates.lock');
    } catch (error) {
      debug("lockfile already released, skipping");
    }
    return true;
  }

  async reboot(force) {
    const options = {
      method: 'POST',
      uri: `${BALENA_SUPERVISOR_ADDRESS}/v1/reboot?apikey=${BALENA_SUPERVISOR_API_KEY}&force=${force || 0}`,
      retry: SUP_RETRY,
      delay: SUP_DELAY,
      verbose_logging: SUP_VERBOSE,
      factor: SUP_FACTOR,
    };
    return rp(options)
      .then((response) => {
        debug(response);
        return response;
      }).catch((e) => {
        throw (e);
      });
  }

  async shutdown(force) {
    const options = {
      method: 'POST',
      uri: `${BALENA_SUPERVISOR_ADDRESS}/v1/shutdown?apikey=${BALENA_SUPERVISOR_API_KEY}&force=${force || 0}`,
      retry: SUP_RETRY,
      delay: SUP_DELAY,
      verbose_logging: SUP_VERBOSE,
      factor: SUP_FACTOR,
    };
    return rp(options)
      .then((response) => {
        debug(response);
        return response;
      }).catch((e) => {
        throw (e);
      });
  }

  async updating() {
    const options = {
      method: 'GET',
      uri: `${BALENA_SUPERVISOR_ADDRESS}/v2/state/status?apikey=${BALENA_SUPERVISOR_API_KEY}`,
      json: true,
      retry: SUP_RETRY,
      delay: SUP_DELAY,
      verbose_logging: SUP_VERBOSE,
      factor: SUP_FACTOR,
    };
    return rp(options)
      .then((response) => {
        debug(`supervisor returned device status ${response.status} and app state ${response.appState}`);
        if (response.status === "success" && response.appState === "applied") {
          return false;
        } else {
          return true
        }
      }).catch((e) => {
        throw (e);
      });
  }
}