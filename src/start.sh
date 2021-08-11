#!/usr/bin/env bash

if ! test -f /data/firmware/bootloader.s37 ;
    then
        echo "Copying bootloader.s37"
        cp openocd/bootloader.s37 /data/firmware/bootloader.s37
fi

node index.js
