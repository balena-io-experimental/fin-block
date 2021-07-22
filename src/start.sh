#!/usr/bin/env bash

if ! test -f /data/firmware/bootloader.s37 ;
    then
        echo "Copying bootloader.s37"
        cp openocd/bootloader.s37 /data/firmware/bootloader.s37
fi

if ! test -f /data/firmware/firmata-v2.0.1.hex  ;
    then
        echo "Copying firmata-v2.0.1.hex"
        cp openocd/firmata-v2.0.1.hex /data/firmware/firmata-v2.0.1.hex
fi

node index.js
