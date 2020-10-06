#!/bin/bash

FW=$1
REV=$2

# Makes sure we exit if lock fails.
set -e

echo "acquiring lockfile..."
exec {lock_fd}>/tmp/balena/updates.lock || exit 1
flock -n "$lock_fd" || { echo "ERROR: failed to acquire lockfile." >&2; rm -f /tmp/balena/updates.lock; exit 1; }

echo "opening screen terminal for flashing $FW to balenaFin v$REV"
case $REV in
  09)
    screen -dmS swd_program  "./openocd/openocd-v1.0.sh"
    ;;
  10)
    screen -dmS swd_program  "./openocd/openocd-v1.1.sh"
    ;;
  *)
    echo "ERROR: unknown balenaFin revision" >&2
    flock -u "$lock_fd"; rm -f /tmp/balena/updates.lock
    exit 1
    ;;
esac
sleep 6
  { sleep 5; echo "reset halt"; echo "program firmware/bootloader.s37"; sleep 5; echo "reset halt"; echo "program firmware/$FW"; echo "reset run"; sleep 10; echo "exit"; echo -e '\x1dclose\x0d'; } | telnet localhost 4444
sleep 5
echo -e "flashing complete\n"
echo "releasing lockfile..."
flock -u "$lock_fd"; rm -f /tmp/balena/updates.lock
echo "closing the openocd process..."
kill $(ps aux | grep '[S]CREEN -dmS swd_program' | awk '{print $2}')
