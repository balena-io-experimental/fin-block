#!/usr/bin/env bash

export DEFAULT_VERSION=v2.0.1
FIRMWARE_PATH=./firmware/firmata-
RELEASE_PATH=https://github.com/balena-io/balena-fin-coprocessor-firmata/releases/download/

echo "Firmata version set to $FIRMATA_VERSION"
if [[ "$FIRMATA_VERSION" == "latest" ]];
    then
        RELEASE_PATH=https://github.com/balena-io/balena-fin-coprocessor-firmata/releases/latest/download
        DEFAULT_VERSION=''
        LATEST_TAG=$(curl --silent "https://api.github.com/repos/balena-io/balena-fin-coprocessor-firmata/releases/latest" | grep -Po '"tag_name": "\K.*?(?=")')
        FILEPATH="${FIRMWARE_PATH}${LATEST_TAG}.hex"
elif [[ ! -z $FIRMATA_VERSION ]]
    then
        v=${FIRMATA_VERSION:0:1}
        if [ "$v" != "v" ];
            then
                DEFAULT_VERSION="v${FIRMATA_VERSION}"
        else
                DEFAULT_VERSION="${FIRMATA_VERSION}"
        fi
    FILEPATH="${FIRMWARE_PATH}${DEFAULT_VERSION}.hex"
fi

if test -f $FILEPATH
    then
        echo "Firmware already downloaded. Skipping."
    else
        echo "Downloading ${DEFAULT_VERSION} firmata firmware."
        FULL_PATH="${RELEASE_PATH}${DEFAULT_VERSION}/firmata.hex"
        echo "${FULL_PATH}"
        curl ${FULL_PATH} -L -o "${FILEPATH}"
fi

node index.js
