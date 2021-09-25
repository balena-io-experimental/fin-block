# Getting Started

The fin block is a docker image that provides a simple interface to advanced features of the [balenaFin](https://balena.io/fin).
This block can be used with other docker services to build complex applications to power your fleets.

## Hardware

Any [balenaFin](https://balena.io/fin) version v1.x+ will work using this block.
Currently this includes:

- v1.0.0
- v1.1.0
- v1.1.1

The block will identify hardware version of the device and configure itself accordingly.

## Software

The easiest way to get started controlling the [balenaFin](https://balena.io/fin) is to deploy this block to your fleet using the button below.

[![fin block deploy with balena](https://balena.io/deploy.svg)](https://dashboard.balena-cloud.com/deploy?repoUrl=https://github.com/balenablocks/fin)

For more advanced use cases, you can build the block as a service alongside other docker services in your `docker-compose.yml` file.
An example is shown below:

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

## Support

If you are having issues identifying the version of your [balenaFin](https://balena.io/fin) or are missing the manufacturing information, please create a thread on our [forums](https://forums.balena.io/c/balena-fin/) to get assistance from one of our support agents.
