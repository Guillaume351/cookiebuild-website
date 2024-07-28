# Dockerfile
FROM node:lts-alpine as build-stage

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy project files
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM node:lts-alpine as production-stage

WORKDIR /app

# Copy built assets from build-stage
COPY --from=build-stage /app/.output ./

# Expose the listening port
EXPOSE 3000

# Run the app
CMD ["node", "server/index.mjs"]