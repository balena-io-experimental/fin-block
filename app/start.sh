#!/usr/bin/env bash

export DEFAULT_VERSION=2.0.1
FIRMWARE_PATH=./firmware/firmata-
RELEASE_PATH=https://github.com/balena-io/balena-fin-coprocessor-firmata/releases/download/

if [[ ! -z $FIRMATA_VERSION ]]
    then
        DEFAULT_VERSION=$FIRMATA_VERSION
fi

FILEPATH="${FIRMWARE_PATH}v${DEFAULT_VERSION}.hex"
if test -f $FILEPATH
    then
        echo "Firmware already downloaded. Skipping."
    else
        echo "Need to download firmware version ${DEFAULT_VERSION}"
        FULL_PATH="${RELEASE_PATH}v${DEFAULT_VERSION}/firmata.hex"
        echo "${FULL_PATH}"
        curl ${FULL_PATH} -L -o "${FILEPATH}"
fi

node index.js
