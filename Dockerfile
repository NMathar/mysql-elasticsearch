FROM node:lts
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app
WORKDIR /home/node/app
USER node

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin
# DATABASE CONFIG
ENV MYSQL_HOST=localhost
ENV MYSQL_USERNAME=root
ENV MYSQL_PASSWORD=root
ENV MYSQL_PORT=3306
ENV MYSQL_DB=testdb
# ELASTIC CONFIG
ENV ES_URL=elasticsearch:9200
ENV ES_USER=elastic
ENV ES_PASSWORD=changeme

COPY package*.json ./
RUN npm install --no-audit
COPY . .
RUN npm run build

# start the app
CMD [ "npm", "start" ]
