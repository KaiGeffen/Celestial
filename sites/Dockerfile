FROM nginx:alpine

# Each marketing site is served at its own path prefix on the main domain:
# /about/, /press/, /privacy/, /streamer/. This replaces the client's
# prodServer serving them, so the game image no longer ships these assets and
# marketing content can be redeployed without rebuilding the game bundle.
COPY about    /usr/share/nginx/html/about
COPY press    /usr/share/nginx/html/press
COPY privacy  /usr/share/nginx/html/privacy
COPY streamer /usr/share/nginx/html/streamer

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
