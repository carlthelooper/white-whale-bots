FROM node:19

ENV TERM=xterm
RUN mkdir /app
WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build
RUN mkdir /logs

VOLUME ["/logs", "/app"]
CMD ["node", "out/index.js", " > ", "/logs/log.txt"]


