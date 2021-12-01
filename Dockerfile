FROM node:16.13-buster-slim
WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.json ./
RUN npm install
RUN npm install -g typescript
RUN /bin/sh -c npm tsc
COPY . .
CMD [ "node", "bot.js" ]