FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

# En prod on lance directement node, mais avec retry c’est safe
CMD ["node", "src/index.js"]
