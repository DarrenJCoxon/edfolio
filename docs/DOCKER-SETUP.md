# Docker Setup Guide for Developers

**Version:** 1.0
**Last Updated:** October 23, 2025
**Audience:** Edfolio developers and contributors

---

## Overview

This guide covers the Docker-based development environment for Edfolio. The containerized setup provides:

- **Zero configuration** - Works out of the box with `docker-compose up`
- **Consistent environments** - Same setup for all developers (Mac, Windows, Linux)
- **Isolated dependencies** - No need to install Node.js, pnpm, PostgreSQL locally
- **Hot reload** - Code changes reflect immediately
- **Database persistence** - Data survives container restarts

---

## Prerequisites

### Required
- **Docker Desktop** (includes Docker Compose)
  - Mac: https://docs.docker.com/desktop/install/mac-install/
  - Windows: https://docs.docker.com/desktop/install/windows-install/
  - Linux: https://docs.docker.com/desktop/install/linux-install/

### Optional (for non-Docker development)
- Node.js 20+
- pnpm 8+
- PostgreSQL 16+

---

## Quick Start

### First Time Setup

```bash
# 1. Clone the repository
git clone https://github.com/DarrenJCoxon/edfolio.git
cd edfolio

# 2. Copy environment template (optional - has good defaults)
cp .env.example .env

# 3. Start Docker containers
docker-compose up

# 4. Open your browser
open http://localhost:3000
```

That's it! The application is running with:
- Next.js dev server on http://localhost:3000
- PostgreSQL database on localhost:5432
- Hot reload enabled for code changes

### Subsequent Starts

```bash
# Start containers (foreground - see logs)
docker-compose up

# OR start in background (detached mode)
docker-compose up -d

# View logs if running in background
docker-compose logs -f app

# Stop containers
docker-compose down

# Stop and remove volumes (fresh database)
docker-compose down -v
```

---

## Docker Architecture

### Services

#### 1. `db` - PostgreSQL Database
- **Image:** `postgres:16-alpine`
- **Container Name:** `edfolio_db`
- **Port:** 5432 (exposed to host)
- **Volume:** `postgres_data` (persists data)
- **Credentials:**
  - Database: `edfolio`
  - User: `edfolio`
  - Password: `edfolio_dev_password`

#### 2. `app` - Next.js Application
- **Build:** `Dockerfile` (development stage)
- **Container Name:** `edfolio_app`
- **Port:** 3000 (exposed to host)
- **Volumes:**
  - Source code mounted for hot reload
  - node_modules isolated in container
- **Environment:** Auto-configured in docker-compose.yml

### File Structure

```
edfolio/
├── Dockerfile              # Multi-stage build (dev + prod)
├── docker-compose.yml      # Local development orchestration
├── .dockerignore          # Files excluded from Docker builds
├── .env.example           # Environment variable template
└── docs/
    └── DOCKER-SETUP.md    # This file
```

---

## Environment Configuration

### Auto-Configured (No Action Needed)

These variables are set automatically in `docker-compose.yml`:

```bash
DATABASE_URL=postgresql://edfolio:edfolio_dev_password@db:5432/edfolio
AUTH_URL=http://localhost:3000
AUTH_SECRET=dev-secret-change-in-production-min-32-chars-required
NODE_ENV=development
```

### Optional Services

To enable AI and email features, add to `.env`:

```bash
# Scaleway AI (Optional)
SCW_ACCESS_KEY=your-access-key
SCW_SECRET_KEY=your-secret-key
SCW_DEFAULT_ORGANIZATION_ID=your-org-id
SCW_DEFAULT_PROJECT_ID=your-project-id
SCW_REGION=fr-par

# Scaleway S3 Storage (Optional)
SCALEWAY_ACCESS_KEY=your-s3-access-key
SCALEWAY_SECRET_KEY=your-s3-secret-key
SCALEWAY_BUCKET_NAME=your-bucket-name
SCALEWAY_REGION=fr-par

# Resend Email (Optional)
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME=Edfolio
```

Then restart: `docker-compose restart`

---

## Common Development Tasks

### Database Operations

#### Run Prisma Studio (Database GUI)
```bash
docker-compose exec app npx prisma studio
```
Opens Prisma Studio at http://localhost:5555

#### Create Database Migration
```bash
docker-compose exec app npx prisma migrate dev --name your-migration-name
```

#### Apply Migrations
```bash
docker-compose exec app npx prisma migrate deploy
```

#### Check Migration Status
```bash
docker-compose exec app npx prisma migrate status
```

#### Reset Database (Danger!)
```bash
docker-compose exec app npx prisma migrate reset
```

#### View Database Logs
```bash
docker-compose logs -f db
```

### Application Operations

#### View Application Logs
```bash
docker-compose logs -f app
```

#### Restart Application Only
```bash
docker-compose restart app
```

#### Install New Dependencies
```bash
# After adding to package.json
docker-compose exec app pnpm install

# OR rebuild the container
docker-compose up --build
```

#### Run Tests
```bash
docker-compose exec app pnpm test
```

#### Run Linter
```bash
docker-compose exec app pnpm lint
```

#### Access Container Shell
```bash
docker-compose exec app sh
```

### Troubleshooting

#### Start Fresh (Nuclear Option)
```bash
# Stop all containers
docker-compose down

# Remove all volumes (deletes database!)
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Rebuild and start
docker-compose up --build
```

#### Check Container Status
```bash
docker-compose ps
```

#### View Resource Usage
```bash
docker stats
```

#### Clear Docker Cache
```bash
docker system prune -a
```

---

## Docker vs. Non-Docker Development

### When to Use Docker

✅ **Use Docker for:**
- First-time contributors (zero setup)
- Testing in production-like environment
- Consistent PostgreSQL version across team
- Avoiding local environment pollution
- Working on multiple projects

### When to Use Non-Docker

✅ **Use Non-Docker (traditional) for:**
- Faster hot reload (native is slightly faster)
- Easier debugging with IDE
- Lower resource usage (no container overhead)
- Already have Node/pnpm/PostgreSQL installed
- Prefer direct file system access

### Switching Between Modes

#### Docker → Non-Docker

1. Stop Docker containers:
   ```bash
   docker-compose down
   ```

2. Install dependencies locally:
   ```bash
   pnpm install
   ```

3. Update `.env` DATABASE_URL:
   ```bash
   DATABASE_URL="postgresql://edfolio:edfolio_dev_password@localhost:5432/edfolio"
   ```

4. Start local PostgreSQL (or keep Docker db running):
   ```bash
   # Option 1: Use Docker just for database
   docker-compose up db -d

   # Option 2: Use local PostgreSQL
   # (ensure same credentials as docker-compose.yml)
   ```

5. Start Next.js locally:
   ```bash
   pnpm dev
   ```

#### Non-Docker → Docker

1. Stop local dev server (Ctrl+C)

2. Update `.env` DATABASE_URL to use Docker service name:
   ```bash
   DATABASE_URL="postgresql://edfolio:edfolio_dev_password@db:5432/edfolio"
   ```

3. Start Docker:
   ```bash
   docker-compose up
   ```

---

## Performance Optimization

### Build Speed

The `.dockerignore` file excludes unnecessary files from Docker builds:
- `node_modules` (reinstalled in container)
- `.next` (rebuilt in container)
- `.git`, `.env` (not needed in container)
- Documentation files (not needed at runtime)

### Hot Reload Performance

**Volumes mounted for hot reload:**
```yaml
volumes:
  - .:/app                    # Mount source code
  - /app/node_modules         # Don't overwrite container's node_modules
  - /app/.next                # Don't overwrite container's .next
```

**Why we exclude node_modules:**
- Host and container might have different architectures (Mac ARM vs Linux AMD)
- Prevents binary incompatibility issues
- Ensures correct dependencies for Linux container

### Memory Usage

Docker Desktop default: 2GB RAM (can be increased)

**If containers are slow:**
1. Docker Desktop → Settings → Resources
2. Increase Memory to 4GB or higher
3. Increase CPU cores to 4+
4. Apply & Restart

---

## Production Build

The Dockerfile supports both development and production modes.

### Test Production Build Locally

```bash
# Build production image
docker build -t edfolio:prod --target production .

# Run production container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e AUTH_URL="http://localhost:3000" \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  edfolio:prod
```

### Production Differences

| Feature | Development | Production |
|---------|-------------|------------|
| Image size | ~1.5GB | ~400MB |
| Hot reload | ✅ Yes | ❌ No |
| Source maps | ✅ Yes | ❌ No (minified) |
| Node env | development | production |
| Running as | root | non-root (nextjs user) |
| Build time | Fast (skips build) | Slower (full build) |

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build and test
        run: |
          docker-compose up -d
          docker-compose exec -T app pnpm test
          docker-compose down
```

### Pre-commit Hooks

```bash
# .husky/pre-commit
#!/bin/sh
docker-compose exec -T app pnpm lint
docker-compose exec -T app pnpm test
```

---

## Troubleshooting Guide

### Issue: Port 3000 already in use

**Error:**
```
Error starting userland proxy: listen tcp4 0.0.0.0:3000: bind: address already in use
```

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# OR change port in docker-compose.yml
ports:
  - "3001:3000"
```

### Issue: Port 5432 already in use

**Error:**
```
Error starting userland proxy: listen tcp4 0.0.0.0:5432: bind: address already in use
```

**Solution:**
```bash
# Option 1: Stop local PostgreSQL
# Mac:
brew services stop postgresql

# Linux:
sudo systemctl stop postgresql

# Option 2: Change port in docker-compose.yml
ports:
  - "5433:5432"

# Update DATABASE_URL in .env
DATABASE_URL="postgresql://edfolio:edfolio_dev_password@localhost:5433/edfolio"
```

### Issue: Database connection failed

**Error:**
```
PrismaClientInitializationError: Can't reach database server
```

**Check:**
1. Is database container running?
   ```bash
   docker-compose ps
   ```

2. Check database logs:
   ```bash
   docker-compose logs db
   ```

3. Is DATABASE_URL correct?
   - Should be `@db:5432` (not `@localhost:5432`) inside containers
   - Should be `@localhost:5432` when accessing from host

### Issue: Hot reload not working

**Symptoms:** Code changes don't reflect in browser

**Solutions:**

1. **Check volumes are mounted:**
   ```bash
   docker-compose exec app ls -la /app
   # Should show your source files
   ```

2. **Restart app container:**
   ```bash
   docker-compose restart app
   ```

3. **Try polling mode (Mac/Windows):**
   Add to `next.config.js`:
   ```javascript
   module.exports = {
     // ... existing config
     webpack: (config) => {
       config.watchOptions = {
         poll: 1000,
         aggregateTimeout: 300,
       };
       return config;
     },
   };
   ```

### Issue: node_modules out of sync

**Symptoms:** Module not found errors after adding dependencies

**Solution:**
```bash
# Rebuild container with new dependencies
docker-compose up --build

# OR install in running container
docker-compose exec app pnpm install
```

### Issue: Database data persists when I don't want it

**Solution:**
```bash
# Remove volumes (deletes database)
docker-compose down -v

# Start fresh
docker-compose up
```

### Issue: Docker build is slow

**Solutions:**

1. **Use BuildKit (faster):**
   ```bash
   DOCKER_BUILDKIT=1 docker-compose up --build
   ```

2. **Check .dockerignore is working:**
   ```bash
   cat .dockerignore
   # Should exclude node_modules, .next, .git
   ```

3. **Clear build cache:**
   ```bash
   docker builder prune -a
   ```

---

## Best Practices

### Do's ✅

- Use `docker-compose up` for daily development
- Keep `.env` file in `.gitignore` (never commit secrets)
- Commit `pnpm-lock.yaml` for reproducible builds
- Use named volumes for data persistence
- Use health checks for database readiness
- Mount source code as volume for hot reload
- Use multi-stage builds (dev + prod in same Dockerfile)

### Don'ts ❌

- Don't commit `.env` files (use `.env.example` template)
- Don't run as root in production (use non-root user)
- Don't copy `node_modules` into container (install fresh)
- Don't expose sensitive ports to 0.0.0.0 in production
- Don't use latest tags (pin specific versions)
- Don't mix host and container node_modules

---

## Additional Resources

- **Docker Documentation:** https://docs.docker.com/
- **Docker Compose Docs:** https://docs.docker.com/compose/
- **Next.js Docker Docs:** https://nextjs.org/docs/deployment#docker-image
- **Prisma with Docker:** https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker

---

## Questions?

- Check `/docs/DEPLOYMENT.md` for production deployment
- Check `/docs/MIGRATION-WORKFLOW.md` for database migrations
- Open an issue on GitHub for help
- See `CLAUDE.md` for development standards

---

**Happy coding! 🚀**
