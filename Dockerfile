FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --only=production && npm cache clean --force

COPY . .

# RUN npm install -g protobufjs-cli
# RUN pbjs -t static-module -w commonjs -o services/lens_protos.js proto/*.proto


EXPOSE 3000

CMD ["node", "server.js"]