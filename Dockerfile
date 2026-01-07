FROM node:22-alpine

# Install netcat for start.sh script checks
RUN apk add --no-cache netcat-openbsd

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

# Expose port
EXPOSE 3333

# Start script
CMD ["./start.sh"]
