# Use the full Node 20 image (Debian-based) for maximum compatibility
FROM node:20-bookworm

# Set working directory
WORKDIR /app

# 1. Install Redis server
RUN apt-get update && apt-get install -y redis-server && rm -rf /var/lib/apt/lists/*

# 2. Copy package files first to leverage Docker layer caching
COPY package*.json ./

# 3. Install ALL dependencies (including module-alias and bcryptjs)
RUN npm install

# 4. Copy the rest of your source code
COPY . .

# 5. Set environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV REDIS_HOST=localhost
ENV REDIS_PORT=6379
ENV USE_QUEUES=true

# 6. Create script to start both Redis and Node
RUN echo '#!/bin/bash\n\
redis-server --daemonize yes\n\
sleep 2\n\
node index.js' > /app/start.sh && chmod +x /app/start.sh

# 7. Expose ports
EXPOSE 5000 6379

# 8. Start both services
CMD ["/app/start.sh"]