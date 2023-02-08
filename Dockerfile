FROM node:19

ENV TERM=xterm
RUN mkdir /usr/src/app
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY src ./src
COPY tsconfig.json ./
COPY .env ./
RUN npm run build

RUN mkdir /logs
VOLUME ["/logs"]

CMD ["node", "out/index.js", " > ", "/logs/log.txt"]
