# Production Dockerfile for Office Asset Management System
FROM node:22-alpine AS runner

# Install build dependencies for better-sqlite3 native compilation on alpine
RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /app

# Install dependencies first for Docker caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Ensure data and upload directories exist with proper permissions
RUN mkdir -p /app/data /app/public/uploads

# Expose server port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/reports/dashboard || exit 1

# Start the application
CMD ["node", "server.js"]
