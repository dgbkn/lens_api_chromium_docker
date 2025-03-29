FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --only=production && npm cache clean --force

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]