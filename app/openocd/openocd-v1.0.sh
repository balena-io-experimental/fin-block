#!/bin/bash

ftdi_eeprom --flash-eeprom /usr/src/app/openocd/config/balena-fin-v1.0-jtag.conf
sleep 1
openocd -f board/balena-fin/balena-fin-v1-0.cfg -f target/efm32.cfg
