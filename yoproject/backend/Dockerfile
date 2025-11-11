FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY backend ./backend

EXPOSE 5001

CMD ["node", "backend/src/server.js"]

