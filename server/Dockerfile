# Use the full Node 20 image (Debian-based) for maximum compatibility
FROM node:20-bookworm

# Set working directory
WORKDIR /app

# 1. Install Redis server and supervisor
RUN apt-get update && apt-get install -y \
    redis-server \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# 2. Copy package files first to leverage Docker layer caching
COPY package*.json ./

# 3. Install ALL dependencies (including module-alias, bcryptjs, and node-cron)
RUN npm install && npm install node-cron

# 4. Copy the rest of your source code (including cron and supervisor folders)
COPY . .

# 5. Make sure cron script is executable
RUN chmod +x /app/cron/generate-blogs.js

# 6. Copy supervisor configuration
COPY supervisor/supervisor.conf /etc/supervisord.conf

# 7. Set environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV REDIS_HOST=localhost
ENV REDIS_PORT=6379
ENV USE_QUEUES=true
ENV BLOG_API_KEY=flexspace-secret-key

# 8. Expose ports
EXPOSE 5000 6379

# 9. Start supervisor (manages Redis, Node app, and Cron)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]