# Build Stage
FROM node:18-alpine as build
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev && npm cache clean --force

# Production Stage
FROM node:18-alpine

# Build argument for server port (can be overridden at build time)
ARG SERVER_PORT=3000

WORKDIR /usr/src/app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install su-exec for switching users in entrypoint script
RUN apk add --no-cache su-exec

# Copy dependencies from build stage
COPY --from=build --chown=nodejs:nodejs /usr/src/app/node_modules ./node_modules

# Copy application files
COPY --chown=nodejs:nodejs . .

# Copy entrypoint script (owned by root so it can fix permissions)
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create uploads directory (will be overridden by volume, but ensures structure exists)
RUN mkdir -p /usr/src/app/uploads && \
    chown -R nodejs:nodejs /usr/src/app/uploads

# Set entrypoint (will switch to nodejs user)
ENTRYPOINT ["docker-entrypoint.sh"]

# Note: We don't set USER here since entrypoint will handle user switching

# Set PORT environment variable (can be overridden at runtime)
ENV PORT=${SERVER_PORT}

# Expose port (metadata only - actual port binding happens at runtime)
EXPOSE 3000

# Health check - uses PORT env var or defaults to 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "const http = require('http'); const port = process.env.PORT || 3000; const req = http.get('http://localhost:' + port + '/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.setTimeout(5000, () => { req.destroy(); process.exit(1); });"

# Start the application (entrypoint will switch to nodejs user before running this)
CMD ["node", "server.js"]