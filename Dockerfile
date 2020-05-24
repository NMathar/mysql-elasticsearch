FROM node:lts
# prepare structure
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app
WORKDIR /home/node/app
USER node

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin

COPY package*.json ./
RUN npm install --no-audit
COPY . .
RUN npm run build

# start the app
CMD [ "npm", "start" ]
