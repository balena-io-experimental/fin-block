# Building Docker Image

This balenaBlock can be pre-built for testing or release.
In order to emulate the pushing images to the balenaBlocks dockerhub org, such as with releasing the block, you can set up a locally hosted docker registry for testing.

## Local Registry

To do this you need to first host a registry server:

```bash
docker run -d -p 5000:5000 --name registry registry:2.7
```
You can then build and push your test image to the registry:
```bash
docker buildx build -t localhost:5000/fin:latest --platform linux/arm/v7 --push --file Dockerfile.template .
```
To use this locally hosted image you can grab it from a docker-compose.yml with:
```docker
services:
  fin:
    image: localhost:5000/fin:latest
```

## npm scripts

We provide `npm` scripts to automate the image building process for development as well as releasing.

```bash
# set up local docker registry
npm run build-local-registry
# buildx for a local registry
npm run build-local
# buildx for remote dockerhub registry release (requires authentication with balenablocks org)
npm run build-release
```
If you want to push this to your balenaCloud fleet for testing:
```bash
npm run build-balena-example --app=${your_fleet_name}
```