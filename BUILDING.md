
## Build with buildx
docker buildx build -t balenaplayground/finblock:latest --platform linux/arm/v7 --file Dockerfile.template .

## Push to the repo
docker push balenaplayground/finblock:latest