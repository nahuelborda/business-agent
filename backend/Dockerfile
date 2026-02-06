FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget --spider -q http://localhost:3000/health || exit 1

# Start server
CMD ["npm", "start"]
