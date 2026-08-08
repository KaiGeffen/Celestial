FROM node:18-alpine

WORKDIR /home/node/app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY bot.js ./

USER node
CMD [ "npm", "start" ]
