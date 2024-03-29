ARG NODEJS_VERSION="12"

## buildstep base image
FROM balenalib/fincm3-node:${NODEJS_VERSION}-build AS buildstep

WORKDIR /usr/src/app
COPY ./package.json package.json
RUN JOBS=MAX npm install --unsafe-perm --production && npm cache clean --force

## target base image
FROM balenalib/fincm3-node:${NODEJS_VERSION}-run
ENV BALENA_OPENOCD_VERSION 0.11.0+dev-g3d9534b-dirty
ENV BALENA_FIN_SDK_VERSION 0.2.0

WORKDIR /usr/src/app
# gather compiled node modules from buildstep
COPY --from=buildstep /usr/src/app/node_modules node_modules

# install required packages
RUN install_packages \
    ftdi-eeprom \
    libftdi-dev \
    telnet \
    ethtool

# install openocd
RUN mkdir openocd && cd openocd && curl -Ls https://github.com/balena-io/balena-fin-openocd/releases/download/v${BALENA_OPENOCD_VERSION}/openocd.tar.gz | tar -xvz -C . \
    && chmod +x install.sh && ./install.sh && cd /usr/src/app && rm -rf openocd

# Move app to filesystem
COPY ./src ./
COPY ./openocd ./openocd
COPY ./VERSION ./VERSION

# Start app
CMD ["bash", "/usr/src/app/start.sh"]
