# Building for development

## Build with npm

```
npm run docker-dev
```

If you want to push this to your application:

```
npm run balena --app=${your_application}
```

# Building for release

## Build with buildx

```
docker buildx build -t balenablocks/fin-block:latest --platform linux/arm/v7 --file Dockerfile.template .
```

## Push to the repo

```
docker push balenablocks/fin-block:latest
```
