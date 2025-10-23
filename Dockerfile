# =============================================================================
# Edfolio Dockerfile
# =============================================================================
# Multi-stage build for optimal image size and development experience
# Supports both development (hot-reload) and production modes

FROM node:20-alpine AS base

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# =============================================================================
# Dependencies Stage - Install all dependencies
# =============================================================================
FROM base AS deps

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile

# =============================================================================
# Builder Stage - Build the application
# =============================================================================
FROM base AS builder

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js for production (only if NODE_ENV=production)
RUN if [ "$NODE_ENV" = "production" ]; then \
      pnpm build; \
    fi

# =============================================================================
# Development Stage - Hot reload for local development
# =============================================================================
FROM base AS development

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Expose Next.js dev server port
EXPOSE 3000

# Run migrations and start development server with hot reload
CMD npx prisma migrate deploy && pnpm dev

# =============================================================================
# Production Stage - Optimized for deployment
# =============================================================================
FROM base AS production

ENV NODE_ENV=production

# Don't run as root in production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files for migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Switch to non-root user
USER nextjs

# Expose production port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run migrations and start production server
CMD npx prisma migrate deploy && node server.js

# =============================================================================
# Default Stage - Use development for local Docker Compose
# =============================================================================
FROM development
