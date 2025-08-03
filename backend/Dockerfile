FROM node:18-alpine

# Install backend dependencies and run the API server
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --production

COPY . .

# Expose the API port
EXPOSE 4000

CMD ["node", "index.js"]