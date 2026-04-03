# Use the full Node 20 image (Debian-based) for maximum compatibility
FROM node:20-bookworm

# Set working directory
WORKDIR /app

# 1. Copy package files first to leverage Docker layer caching
COPY package*.json ./

# 2. Install ALL dependencies (including module-alias and bcryptjs)
# Using 'npm ci' is faster and more reliable for production/CI environments
RUN npm install

# 3. Copy the rest of your source code
COPY . .

# 4. Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# 5. Expose the port
EXPOSE 5000

# 6. Start the server (ensure this points to your entry file)
CMD ["node", "index.js"]