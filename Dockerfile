FROM node:16.13-buster-slim
WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.json ./
RUN npm install
COPY . .
CMD [ "node", "bot.js" ]