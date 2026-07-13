# Dockerfile
FROM node:24.18.0-alpine AS build-stage

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy project files
COPY . .

# Validate types before producing the server bundle.
ENV NODE_ENV=production
RUN npm run typecheck && npm run build

# Production stage
FROM node:24.18.0-alpine AS production-stage

WORKDIR /app

# Copy built assets from build-stage
COPY --from=build-stage --chown=node:node /app/.output ./

# Expose the listening port
EXPOSE 3000

USER node

# Run the app
CMD ["node", "server/index.mjs"]
