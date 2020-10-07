#!/usr/bin/env bash


FW_PATH=/usr/src/app/firmware/firmata-
RELEASE_PATH=https://github.com/balena-io/balena-fin-coprocessor-firmata/releases/download/

if [[ ! -z $FIRMATA_VERSION ]]
    then
        FILEPATH="${FW_PATH}${FIRMATA_VERSION}.hex"
        if test -f $FILEPATH
            then
                echo "Firmware already downloaded. Skipping."
            else
                echo "Need to download firmware version ${FIRMATA_VERSION}"
                FULL_PATH="${RELEASE_PATH}v${FIRMATA_VERSION}/firmata.hex"
                echo "${FULL_PATH}"
                /usr/bin/wget ${FULL_PATH} -o "${FILEPATH}"
        fi
fi

# if [[ ! -z $FIRMATA_REPL ]]
#     then
        node index.js
#     else
#         firmata
# fi
