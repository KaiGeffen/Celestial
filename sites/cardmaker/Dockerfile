FROM nginx:alpine

# The card maker ships as its own image (separate from the shared marketing
# `sites` image) so it can be deployed and iterated independently.
# Served at /cardmaker/ on the main domain via NPM custom location.
COPY . /usr/share/nginx/html/cardmaker

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
