# Use Node.js Alpine for a lightweight production image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# 1. Copy package files FROM the current directory (server/)
COPY package*.json ./

# 2. Install production dependencies only
RUN npm install --production

# 3. Copy all backend source code FROM the current directory (server/)
COPY . .

# 4. Set environment variables
# Note: In production, it's safer to pass .env variables 
# via your deployment platform (Render/Vercel) rather than copying the file.
ENV NODE_ENV=production
ENV PORT=5000

# 5. Expose the port your Express app listens on
EXPOSE 5000

# 6. Start the server
# Ensure index.js is the correct entry point in your server folder
CMD ["node", "index.js"]