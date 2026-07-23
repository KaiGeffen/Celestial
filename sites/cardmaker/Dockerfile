# The card maker ships as its own image (separate from the shared marketing
# `sites` image) so it can be deployed and iterated independently.
#
# Build from the REPO ROOT (the image pulls game assets + card data from
# client/ and shared/ so the card maker always matches the game):
#   docker build -t cardmaker -f sites/cardmaker/Dockerfile .

# Stage 1: copy the game's card assets and generate card/keyword data
FROM node:18 AS gamedata

WORKDIR /build
COPY shared shared
COPY client/assets/img/card client/assets/img/card
COPY sites/cardmaker/generateAssets.ts sites/cardmaker/generateAssets.ts

RUN npx -y tsx sites/cardmaker/generateAssets.ts

# Stage 2: static site on nginx, served at /cardmaker/ via NPM custom location
FROM nginx:alpine

COPY sites/cardmaker /usr/share/nginx/html/cardmaker
COPY --from=gamedata /build/sites/cardmaker/assets /usr/share/nginx/html/cardmaker/assets

COPY sites/cardmaker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
