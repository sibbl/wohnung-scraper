FROM node:11-alpine

WORKDIR /app
ENV IS_DOCKER 1

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

ENV PORT 80

EXPOSE 80

CMD [ "npm", "run", "server" ]
