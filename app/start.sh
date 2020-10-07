#!/usr/bin/env bash

VERSION=2.0.1
FIRMWARE_PATH=./firmware/firmata-
RELEASE_PATH=https://github.com/balena-io/balena-fin-coprocessor-firmata/releases/download/

if [[ ! -z $FIRMATA_VERSION ]]
    then
        VERSION=$FIRMATA_VERSION
fi

FILEPATH="${FIRMWARE_PATH}v${VERSION}.hex"
if test -f $FILEPATH
    then
        echo "Firmware already downloaded. Skipping."
    else
        echo "Need to download firmware version ${VERSION}"
        FULL_PATH="${RELEASE_PATH}v${VERSION}/firmata.hex"
        echo "${FULL_PATH}"
        curl ${FULL_PATH} -L -o "${FILEPATH}"
fi

if [[ ! -z $FIRMATA_REPL ]]
    then
        node repl.js
    else
        node index.js
fi
