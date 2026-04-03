# Use Node.js Alpine for a lightweight production image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json & package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN npm install 

# Copy all source code
COPY . .

# Set environment variables (override via Render or other platform)
ENV NODE_ENV=production
ENV PORT=5000

# Expose the port your app listens on
EXPOSE 5000

# Use the port from environment variable in index.js
CMD ["node", "index.js"]