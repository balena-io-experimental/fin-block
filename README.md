# finabler

Provides a simple interface for controlling the balenaFin's coprocessor running the firmata protocol.
The `finabler` block is a docker image that provides flashing utilities, status tagging, sleep control and firmata control functionality.

## Features

- Control the power mode of the balenaFin
- Control the coprocessor GPIO
- Retrieve firmata implementation version
- Automatically flash latest firmata firmware to the coprocessor
- Ability to set `DEV_MODE` for on device firmware development
- Pin the firmata release version with `FIRMATA_VERSION`
- Automatically applies device tree overlays required for the coprocessor

## Use

Add the following to your `docker-compose`:

```yaml
version: '2.1'
volumes:
    fin:
services:
  finblock:
    restart: always
    image: balenablocks/finabler:latest
    network_mode: host
    privileged: true
    volumes:
      - 'fin:/data/firmware'
    labels:
      io.balena.features.supervisor-api: '1'
      io.balena.features.balena-api: '1'
    expose:
      - "1337"
```

## How to use

The firmata block is partly controlled with a REST interface and partly with device variables.

### REST Interface

This is a web API hosted at port `1337` on the local device.
For example, sending the balenaFin to sleep for 1 minute with a 10 second delay, using `curl`:

```bash
curl -X POST localhost:1337/sleep/10/60
```
#### [GET] `/ping`

Used to know the block is ready to recieve instructions.

*note: this will be expanded to return HTTP unavailable when the device is flashing or about to reboot*

#### [GET] `/firmware`

Retrieves the firmata implementation version.

#### [POST] `/sleep/${int:delay}/${int:timeout}`

triggers the balenaFin power saving mode.
- `delay` (integer): length of time (seconds) the coprocessor will wait before forcefully shutting down the compute module
- `timeout` (integer): length of time (seconds) the coprocessor will keep the compute module shut down before powering it back on. 
There is a limit of 97 years (3,058,992,000 seconds) as the max value the coprocessor can handle.
- You can override update checks that would otherwise prevent the sleep from being triggered passing `force` in the body of the request: `{"force":1}`

#### [POST] `/set/${int:pin}/${int:state}`

set digital pin state on the coprocessor header.
- `pin` (integer): `Expansion Header` pin numbering as referred to [here](https://github.com/balena-io/balena-fin-coprocessor-firmata#firmata-pin-map).
- `state` (integer): is either 1 (on) or 0 (off)

### Device Variables

These should be set from the balenaCloud dashboard and can either be for a specific device or multiple devices in a fleet.

#### `FIRMATA_VERSION`

Setting `FIRMATA_VERSION` will pin a specific firmata release firmware to the device.
Specific releases can be found from the [firmata release](https://github.com/balena-io/balena-fin-coprocessor-firmata/releases) page or pass `latest` will fetch and install the most recent release firmware.

#### `DEV_MODE`

Setting `DEV_MODE` in the device variables will stop the firmata block from automatically flashing the latest firmata release.
Instead it will watch a shared volume `/data/firmware` for any `.hex` file changes.
This can be used as a tight feedback loop for development as another container could compile new `.hex` binaries for compiling and the firmata block will automatically flash them.
