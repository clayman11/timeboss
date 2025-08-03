FROM node:18-alpine

# Install frontend dependencies and build the Next.js app
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --production

COPY . .

# Build the production version of the Next.js app
RUN npm run build

# Expose the port that Next.js will serve on
EXPOSE 3000

# Start the production server
CMD ["npm", "start"]