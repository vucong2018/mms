FROM node:18-alpine

WORKDIR /fullstack_project

COPY ./package.json ./package.json
COPY ./assets ./assets
COPY ./public ./public
COPY ./config ./config
COPY ./modules ./modules
COPY ./.env ./.env
COPY ./loader.js ./loader.js
COPY ./main.js ./main.js

RUN yarn install
CMD ["node", "main.js"]


