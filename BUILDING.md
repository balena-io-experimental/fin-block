
## Build with buildx
docker buildx build -t balenablocks/finabler::latest --platform linux/arm/v7 --file Dockerfile.template .

## Push to the repo
docker push balenablocks/finabler::latest