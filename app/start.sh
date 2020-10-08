#!/usr/bin/env bash

export DEFAULT_VERSION=2.0.1
FIRMWARE_PATH=/data/firmware/firmata-
RELEASE_PATH=https://github.com/balena-io/balena-fin-coprocessor-firmata/releases/download/

if [[ "$FIRMATA_VERSION" == "latest" ]];
    then
        DEFAULT_VERSION=$(curl --silent "https://api.github.com/repos/balena-io/balena-fin-coprocessor-firmata/releases/latest" | grep -Po '"tag_name": "\K.*?(?=")')
elif [[ ! -z $FIRMATA_VERSION ]]
    then
        DEFAULT_VERSION="${FIRMATA_VERSION}"
fi

v=${DEFAULT_VERSION:0:1}
if [ "$v" != "v" ];
    then
        DEFAULT_VERSION="v${DEFAULT_VERSION}"
fi

FILEPATH="${FIRMWARE_PATH}${DEFAULT_VERSION}.hex"

echo "Firmata version set to ${DEFAULT_VERSION}"

if test -f $FILEPATH
    then
        echo "Firmware already downloaded. Skipping."
    else
        echo "Downloading ${DEFAULT_VERSION} firmata firmware."
        FULL_PATH="${RELEASE_PATH}${DEFAULT_VERSION}/firmata.hex"
        echo "${FULL_PATH}"
        curl ${FULL_PATH} -L -o "${FILEPATH}"
fi

export SELECTED_VERSION=$DEFAULT_VERSION

node index.js
