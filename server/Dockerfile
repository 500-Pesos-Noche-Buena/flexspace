# Use the full Node 20 image (Debian-based) for maximum compatibility
FROM node:20-bookworm

# Set working directory to /app/server (where your backend code is)
WORKDIR /app/server

# 1. Copy server package files first
COPY server/package*.json ./

# 2. Install ALL dependencies
RUN npm install

# 3. Copy the rest of your source code
COPY . .

# 4. Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# 5. Expose the port
EXPOSE 5000

# 6. Install PM2 globally for process management
RUN npm install -g pm2

# 7. Create PM2 ecosystem file to run both API and worker
RUN echo '{ \
    "apps": [ \
    { \
    "name": "api", \
    "script": "index.js", \
    "instances": 1, \
    "exec_mode": "fork", \
    "env": { \
    "NODE_ENV": "production" \
    } \
    }, \
    { \
    "name": "worker", \
    "script": "worker.js", \
    "instances": 1, \
    "exec_mode": "fork", \
    "env": { \
    "NODE_ENV": "production" \
    } \
    } \
    ] \
    }' > ecosystem.json

# 8. Start both processes with PM2
CMD ["pm2-runtime", "start", "ecosystem.json"]