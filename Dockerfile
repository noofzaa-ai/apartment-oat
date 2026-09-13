# Multi-stage build for Next.js app with Prisma + better-sqlite3
# Using bookworm-slim (not alpine) to leverage prebuilt better-sqlite3 binaries
# and avoid network timeouts during native rebuild.
# Note: better-sqlite3 v13+ requires Node.js >= 22

# Stage 1: Builder
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3 and pdfkit
# bookworm includes python3, build-essential by default
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 build-essential \
    libcairo2-dev libjpeg62-turbo-dev libpango1.0-dev libgif-dev libpixman-1-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and lock file for reproducible installs
COPY package*.json ./

# Install all dependencies (without --ignore-scripts to let postinstall download prebuilts)
# bookworm has libc6 which better-sqlite3 has prebuilds for (node-v127-linux-x64)
# Postinstall script will attempt to download prebuilt better-sqlite3 binaries
RUN npm ci

# Generate Prisma client and run build
COPY prisma ./prisma
COPY . .
RUN npm run prisma:generate && npm run build

# Stage 2: Runtime
FROM node:22-bookworm-slim

WORKDIR /app

# Install only runtime dependencies (for pdfkit, cairo rendering, and healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 libjpeg62-turbo libpango1.0-0 libgif7 libpixman-1-0 wget \
    && rm -rf /var/lib/apt/lists/*

# Copy entire node_modules from builder (with all native bindings already built)
# This avoids recompiling better-sqlite3 in runtime stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Copy Prisma schema for runtime migrations
COPY prisma ./prisma

# Copy next.js build output (with standalone output)
COPY --from=builder /app/.next/standalone ./

# Copy public and static assets
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Thai font assets (required by lib/pdf.ts)
COPY --from=builder /app/assets ./assets

# Copy docker-entrypoint script for migration and seeding
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Create data directory for SQLite database (will be mounted as volume)
# Create uploads directory for payment slips (will be mounted as volume)
RUN mkdir -p /app/data /app/uploads


# Expose port (can be overridden via PORT env var)
EXPOSE 3000

# Health check using wget (available in slim images) or fallback to node
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

# Use entrypoint script to run migrations and seed before starting server
ENTRYPOINT ["/app/docker-entrypoint.sh"]
