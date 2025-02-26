FROM node:18-alpine

WORKDIR /app

# Copy package files first (for better layer caching)
COPY package*.json ./

# Install dependencies with the legacy-peer-deps flag
RUN npm install --legacy-peer-deps

# Copy application code AFTER installing dependencies
# This prevents the node_modules conflict
COPY . .

# Build the application
RUN npm run build

# Set production environment
ENV NODE_ENV production

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"] 