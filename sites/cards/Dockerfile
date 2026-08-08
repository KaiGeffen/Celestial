# The card tools ship as their own image (separate from the shared marketing
# `sites` image) so they can be deployed and iterated independently.
#
# Build from the REPO ROOT (the image pulls game assets + card data from
# client/ and shared/ so the card tools always match the game):
#   docker build -t cards -f sites/cards/Dockerfile .

# Stage 1: copy the game's card assets and generate card/keyword data
FROM node:18 AS gamedata

WORKDIR /build
COPY shared shared
COPY client/assets/img/card client/assets/img/card
COPY client/assets/fonts client/assets/fonts
COPY sites/cards/generateAssets.ts sites/cards/generateAssets.ts

RUN npx -y tsx sites/cards/generateAssets.ts && rm sites/cards/generateAssets.ts

# Stage 2: static site on nginx, served at /cards/ via NPM custom location
FROM nginx:alpine

COPY sites/cards /usr/share/nginx/html/cards
# assets/ and the generated per-card page directories (e.g. rooster/) both
# live under this same stage-1 dir — one copy picks up both.
COPY --from=gamedata /build/sites/cards /usr/share/nginx/html/cards

COPY sites/cards/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
