FROM node:20-alpine

# Install Ghostscript CLI binary package
RUN apk add --no-cache ghostscript

WORKDIR /app

# Copy package definition and install dependencies
COPY package.json ./
RUN npm install --production

# Copy application source code
COPY . .

EXPOSE 3001

CMD ["npm", "start"]
