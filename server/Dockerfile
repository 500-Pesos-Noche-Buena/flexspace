# Use Node.js Alpine for small image
FROM node:20-alpine

WORKDIR /app

# Copy backend package files and install dependencies
COPY server/package*.json ./
RUN npm install --production

# Copy backend source code
COPY server/ ./

# Copy backend .env if needed
COPY server/.env ./

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Start backend server with node
CMD ["node", "index.js"]