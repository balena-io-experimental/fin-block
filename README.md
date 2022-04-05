![logo](https://raw.githubusercontent.com/balenablocks/fin/master/images/logo.png)

[![balena](https://github.com/balenablocks/fin-block/actions/workflows/balena.yml/badge.svg)](https://github.com/balenablocks/browser/actions/workflows/balena.yml)

**The fin block is a balenaBlock that provides flashing utilities, status tagging, sleep control and firmata control functionality of the [balenaFin](https://www.balena.io/fin/).**

## Highlights

- **Control the balenaFin's hardware**: Including the balenaFin's power modes and firmata on the coprocessor
- **Flash the balenaFin's coprocessor**: Either with our provided firmata firmware or with custom firmware
- **Retrieve manufacturing info about the balenaFin**: Access the serial ID, manufacturing date and more

## Setup and configuration

Use this as standalone with the button below:

[![fin block deploy with balena](https://balena.io/deploy.svg)](https://dashboard.balena-cloud.com/deploy?repoUrl=https://github.com/balenablocks/fin)

Or add the following service to your `docker-compose.yml`:

```yaml
version: "2.1"
volumes:
  fin:
services:
  fin:
    restart: always
    image: bh.cr/balenablocks/fin-block 
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

> :wrench: Please be aware that this block only supports the balenaFin (v1.+)

## Documentation

Head over to our docs for detailed installation and usage instructions, customization options and more!

## Motivation

![fin](https://raw.githubusercontent.com/balenablocks/fin/master/images/fin.png)

The [balenaFin](https://www.balena.io/fin/) is a Raspberry Pi Compute Module carrier board that can run all the software that the Raspberry Pi can run, but hardened for deployment in the field.
Even better, it’s offered at an accessible price point relative to other professional boards.
This block allows you to easily utilise some of the more advanced features the balenaFin has to offer.

## Notes

The fin block is now maintained at balena's registry and the image can be found at `bh.cr/balenablocks/fin-block`.
The image is still maintained at Docker Hub (`balenablocks/finabler`) but will no longer be updated, so please switch to balena's registry if you wish to use the latest version.

## Contributing

Do you want to help make balenaSense better? Take a look at our Contributing Guide. Hope to see you around!

## Getting Help

If you're having any problem, please [raise an issue](https://github.com/balenablocks/fin/issues/new) on GitHub and we will be happy to help.

## License

fin-block is free software, and may be redistributed under the terms specified in the [license](https://github.com/balenablocks/fin/blob/master/LICENSE).
