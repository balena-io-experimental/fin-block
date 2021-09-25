# Docker Compose

In order to use the fin block alongside your application, you can add the service to your `docker-compose` file.

For example:

```yaml
version: "2.1"
volumes:
  fin:
services:
  fin:
    restart: always
    image: balenablocks/fin:latest
    network_mode: host
    privileged: true
    volumes:
      - "fin:/data/firmware"
    labels:
      io.balena.features.supervisor-api: "1"
      io.balena.features.balena-api: "1"
    environment:
      - "DEBUG=firmata,flasher,downloader,supervisor,eeprom,main"
      - "AUTOFLASH=1"
      - "AUTOCONFIG=1"
    expose:
      - "1337"
```

## Config Variables

Various functionality can be enabled/disabled by setting certain device variables.
This includes debug logging, the ability to automatically flash the coprocessor of the balenaFin on startup and automatically configuring device overlays for communication with the balenaFin's coprocessor.

These can either be set in the dockerfile or within the balenaCloud device settings.

### DEBUG

Enables logging for various internal methods including: `firmata`, `flasher`, `downloader`, `supervisor`, `eeprom` and `main`.
This defaults to `DEBUG=firmata,flasher,downloader,supervisor,eeprom,main`.

```yaml
  environment:
    - "DEBUG=firmata,flasher,downloader,supervisor,eeprom,main"
```

### AUTOFLASH

Enables automatic flashing of the coprocessor upon block startup.
This should be disabled if using custom firmware as it will currently attempt to flash the latest version of the firmata firmware to the coprocessor.
It will fetch and download the latest version of the balenaFin coprocessor firmata firmware.
This defaults to `AUTOFLASH=1`.

```yaml
  environment:
    - "AUTOFLASH=1"
```

### AUTOCONFIG

Enables automatic application of device tree overlays upon block startup.
This will prompt the device to reboot if the specified balenaFin overlays are missing and need to be applied.
This defaults to `AUTOCONFIG=1`.

```yaml
  environment:
    - "AUTOCONFIG=1"
```

The `BALENA_HOST_CONFIG_dtoverlay` (DT overlays) that will be applied are:
```
"balena-fin"
"uart1,txd1_pin=32,rxd1_pin=33"
```

Where the UART configuration is specific to balenaFin v1.1.x devices.
Additionally, the `BALENA_HOST_CONFIG_core_freq` will be set to 250 for the UART to correctly function.

## REST API

The fin block is partly controlled with a REST interface and partly with device variables.
This is a web API hosted at port `1337` on the local device.
For example, sending the balenaFin to sleep for 1 minute with a 10 second delay, using `curl`:

```bash
curl -X POST localhost:1337/sleep
```

with the following payload:

```json
{
  "sleepTime" : 60,
  "sleepDelay" : 1
}
```

### firmware

This endpoint is used to control the flashing of firmware onto the balenaFin coprocessor.
If the block is configured for `AUTOFLASH`, firmata firmware will already be flashed to the coprocessor  at startup.

#### GET

```bash
curl -X GET localhost:1337/firmware
```

```json
{
  "firmataName":"StandardFirmata",
  "firmataVersion":"2.5",
  "implementationVersion":"v2.0.1"
}
```

#### POST

```bash
curl -X POST localhost:1337/firmware
```

with the following payload:

```json
{
  "bootloaderFile" : "/path/to/the/bootloader",
  "firmwareFile" : "/path/to/the/firmware"
}
```

### eeprom

The `eeprom` endpoint is used to read the eeprom on the USB/ethernet hub.
This contains manufacturing information concerning the balenaFin's serial number.

#### GET

```bash
curl -X GET localhost:1337/eeprom
```

This will return the manufacturing information about the target balenaFin.
For example:

```json
{
  "schema":1,
  "hardwareRevision":10,
  "batchSerial":123,
  "week":12,
  "year":2021,
  "pcbaLot":"1234-1234",
  "RAW":"123456789101112-1234"
}
```

#### POST [for internal/manufacturing use only]

```bash
curl -X POST localhost:1337/eeprom -H "Content-Type: application/json"
```

This endpoint is protected by a manufacturing key and should not be used outside of manufacturing as the serial ID is used by the balena support agents for device identification.
The `serial` parameter should be formatted and validated correctly for the device, which is performed at manufacturing.
The same serial information is encoded on the QR code sticker on the top of the balenaFin.
Balena support agents can access this key internally.

```json
--data 
'{
  "serial":"123456789101112-1234", 
  "mfgKey":"xxxxxxxxx"
}'
```

> :warning: If the user modifies or tampers with the serial ID stored at this endpoint, we may be unable to provide device support. Proceed with caution!

### sleep

The `sleep` endpoint is used to send the balenaFin into a low power sleep state.
The delay to trigger sleep and the period in which the device sleeps can be controlled.

#### POST

```bash
curl -X POST localhost:1337/sleep
```

The endpoint expects both arguments to be passed upon request, `sleepTime` for the period of sleeping and `sleepDelay` for the time after receiving the command to trigger sleeping (both in seconds).
`sleepDelay` is useful for safely shutting down the OS before cutting power to it.

with the following payload (60 seconds of sleeping and a 5 second starting delay):

```json
{
  "sleepTime" : 60,
  "sleepDelay" : 5
}
```

### pin

This is used to control the GPIO available on the balenaFin coprocessor.

#### GET

```bash
curl -X GET localhost:1337/pin -H "Content-Type: application/json" --data
```

Retrieves the digital state of a GPIO on the balenaFin's coprocessor.
`pin` selects the GPIO pin.
The response will include a 1 or 0 for the `state` of that `pin`.

```json
{
  "pin" : 2
}
```

#### POST

```bash
curl -X POST localhost:1337/pin
```

Sets the digital state of a GPIO on the balenaFin's coprocessor.
`pin` selects the GPIO pin and `state` may be set to 1 or 0.

```json
{
  "pin" : 2,
  "state": true
}
```
