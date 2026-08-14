# Multi-stage build for Meteor 3.x with Rspack
FROM node:20-alpine AS builder

WORKDIR /app

# Install system build dependencies
RUN apk add --no-cache bash curl python3 make g++ git

# Install Meteor
RUN curl -sL https://install.meteor.com/ | sh

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy project source
COPY . .

# Build Meteor production bundle
ENV METEOR_ALLOW_SUPERUSER=true
RUN meteor build --directory /build --server-only

# Runtime Stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies for the bundle
COPY --from=builder /build/bundle /app

WORKDIR /app/programs/server
RUN npm install --production

WORKDIR /app

ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "main.js"]
