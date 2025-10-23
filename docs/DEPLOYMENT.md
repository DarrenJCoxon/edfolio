# Production Deployment Guide

**Version:** 1.0
**Last Updated:** October 23, 2025
**Audience:** Users deploying Edfolio to production

---

## Overview

This guide covers deploying Edfolio to production environments. We support multiple deployment strategies:

1. **Vercel + Managed Database** (Recommended for beginners)
2. **Self-Hosted with Docker** (Full control)
3. **Railway** (Simple full-stack deployment)

All options support the same features and use identical environment variables.

---

## Prerequisites

### Required
- Git repository with Edfolio code
- PostgreSQL database (managed or self-hosted)

### Recommended
- Custom domain (optional but professional)
- Scaleway account (for AI features)
- Resend account (for emails)

---

## Option 1: Vercel + Managed Database (Recommended)

**Best for:** Most users, easy scaling, serverless benefits
**Cost:** Free tier available ($0/month to start)
**Setup Time:** ~15 minutes

### Step 1: Set Up Database

Choose one provider (all have free tiers):

#### Option A: Railway PostgreSQL
1. Go to https://railway.app
2. Sign up/log in
3. Click "New Project" → "Provision PostgreSQL"
4. Once created, click the PostgreSQL service
5. Go to "Variables" tab → Copy `DATABASE_URL`

**Free tier:** 500 hours/month (16 hours/day)

#### Option B: Supabase PostgreSQL
1. Go to https://supabase.com
2. Sign up/log in
3. Click "New Project"
4. Set name, database password, region (choose EU for GDPR)
5. Once created, go to "Project Settings" → "Database"
6. Copy "Connection string" (URI format)
7. Replace `[YOUR-PASSWORD]` with your database password

**Free tier:** 500MB storage, unlimited time

#### Option C: Neon PostgreSQL
1. Go to https://neon.tech
2. Sign up/log in
3. Click "Create a project"
4. Set name, region (choose EU for GDPR)
5. Copy the connection string

**Free tier:** 3GB storage, unlimited time

#### Option D: Vercel Postgres
1. In Vercel dashboard → "Storage" → "Create Database"
2. Select "Postgres"
3. Choose region (choose EU for GDPR)
4. Copy connection string from "Connection String" tab

**Free tier:** 256MB storage

### Step 2: Deploy to Vercel

1. **Fork/Push Repository**
   ```bash
   # If you haven't already
   git remote add origin https://github.com/your-username/edfolio.git
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to https://vercel.com
   - Click "Add New..." → "Project"
   - Import your Git repository
   - Vercel auto-detects Next.js settings ✅

3. **Configure Environment Variables**

   Before deploying, add these in Vercel:

   **Required:**
   ```bash
   DATABASE_URL=postgresql://...  # From Step 1
   AUTH_SECRET=<generate-new>     # See below
   ```

   **Generate AUTH_SECRET:**
   ```bash
   openssl rand -base64 32
   ```

   **Optional (enable features as needed):**
   ```bash
   # Scaleway AI
   SCW_ACCESS_KEY=your-access-key
   SCW_SECRET_KEY=your-secret-key
   SCW_DEFAULT_ORGANIZATION_ID=your-org-id
   SCW_DEFAULT_PROJECT_ID=your-project-id
   SCW_REGION=fr-par

   # Scaleway S3 Storage
   SCALEWAY_ACCESS_KEY=your-s3-access-key
   SCALEWAY_SECRET_KEY=your-s3-secret-key
   SCALEWAY_BUCKET_NAME=your-bucket-name
   SCALEWAY_REGION=fr-par

   # Resend Email
   RESEND_API_KEY=your-resend-api-key
   EMAIL_FROM_ADDRESS=noreply@yourdomain.com
   EMAIL_FROM_NAME=Edfolio

   # Cron Security (if using scheduled tasks)
   CRON_SECRET=<generate-with-openssl-rand-base64-32>
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build
   - Your app is live! 🎉

5. **Apply Database Migrations**

   Vercel automatically runs migrations on deploy if you have this in `package.json`:
   ```json
   {
     "scripts": {
       "build": "prisma generate && prisma migrate deploy && next build"
     }
   }
   ```

   **If migrations fail:**
   - Check Vercel deployment logs
   - Verify DATABASE_URL is correct
   - Check database is accessible from Vercel

### Step 3: Configure Custom Domain (Optional)

1. In Vercel → "Settings" → "Domains"
2. Add your domain: `edfolio.yourdomain.com`
3. Follow DNS configuration instructions
4. Update `AUTH_URL` environment variable:
   ```bash
   AUTH_URL=https://edfolio.yourdomain.com
   ```
5. Redeploy

### Step 4: Enable Optional Services

#### Enable AI Features (Scaleway)

1. **Get API Keys:**
   - Go to https://console.scaleway.com/
   - Create account (free tier available)
   - Create a project or use default
   - Go to "IAM" → "API Keys" → "Generate API Key"
   - Copy Access Key and Secret Key
   - Go to "Project Settings" → Copy Organization ID and Project ID

2. **Add to Vercel:**
   ```bash
   SCW_ACCESS_KEY=scw_1A2B3C4D...
   SCW_SECRET_KEY=abc123def456...
   SCW_DEFAULT_ORGANIZATION_ID=1a2b3c4d-...
   SCW_DEFAULT_PROJECT_ID=1a2b3c4d-...
   SCW_REGION=fr-par
   ```

3. **Redeploy** (or wait for next deployment)

#### Enable File Uploads (Scaleway S3)

1. **Create Storage Bucket:**
   - Go to https://console.scaleway.com/object-storage/buckets
   - Click "Create Bucket"
   - Set name, region (fr-par), visibility (private)
   - Note the bucket name

2. **Get S3 Credentials:**
   - Go to "IAM" → "API Keys"
   - Generate S3/API credentials
   - Copy Access Key and Secret Key

3. **Add to Vercel:**
   ```bash
   SCALEWAY_ACCESS_KEY=your-s3-access-key
   SCALEWAY_SECRET_KEY=your-s3-secret-key
   SCALEWAY_BUCKET_NAME=your-bucket-name
   SCALEWAY_REGION=fr-par
   ```

#### Enable Email (Resend)

1. **Get API Key:**
   - Go to https://resend.com/
   - Sign up (free tier: 100/day, 3,000/month)
   - Verify your domain OR use `onboarding@resend.dev` for testing
   - Go to "API Keys" → "Create API Key"
   - Copy the key

2. **Add to Vercel:**
   ```bash
   RESEND_API_KEY=re_abc123...
   EMAIL_FROM_ADDRESS=noreply@yourdomain.com
   EMAIL_FROM_NAME=Edfolio
   ```

---

## Option 2: Self-Hosted with Docker

**Best for:** Full control, self-hosting, custom infrastructure
**Cost:** Depends on hosting provider
**Setup Time:** ~30 minutes

### Requirements

- Linux server (VPS, dedicated, cloud VM)
- Docker & Docker Compose installed
- Domain pointing to server
- SSL certificate (Let's Encrypt recommended)

### Step 1: Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### Step 2: Clone Repository

```bash
# Clone to server
git clone https://github.com/your-username/edfolio.git
cd edfolio
```

### Step 3: Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit with your values
nano .env
```

**Required configuration:**
```bash
# Update DATABASE_URL if using external database
DATABASE_URL=postgresql://...

# Generate new secrets
AUTH_SECRET=$(openssl rand -base64 32)

# Set your domain
AUTH_URL=https://your-domain.com

# Add optional services (Scaleway, Resend, etc.)
```

### Step 4: Set Up SSL with Nginx

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

**Create Nginx config:**
```nginx
# /etc/nginx/sites-available/edfolio
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/edfolio /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: Deploy with Docker

**Production docker-compose.yml:**
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_DB: edfolio
      POSTGRES_USER: edfolio
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - edfolio_network

  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    restart: always
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://edfolio:${DB_PASSWORD}@db:5432/edfolio
      AUTH_URL: ${AUTH_URL}
      AUTH_SECRET: ${AUTH_SECRET}
      NODE_ENV: production
      # Add all other env vars from .env
    depends_on:
      - db
    networks:
      - edfolio_network

volumes:
  postgres_data:

networks:
  edfolio_network:
```

**Deploy:**
```bash
# Build and start
docker compose -f docker-compose.prod.yml up -d --build

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### Step 6: Set Up Automatic Updates

**Create update script:**
```bash
#!/bin/bash
# update-edfolio.sh

cd /path/to/edfolio
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

**Set up systemd service for auto-restart:**
```ini
# /etc/systemd/system/edfolio.service
[Unit]
Description=Edfolio Application
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/path/to/edfolio
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable edfolio
sudo systemctl start edfolio
```

---

## Option 3: Railway Full-Stack

**Best for:** Simplest full-stack deployment
**Cost:** $5/month minimum (includes database)
**Setup Time:** ~10 minutes

### Steps

1. **Deploy to Railway:**
   - Go to https://railway.app
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your Edfolio repository
   - Railway auto-detects Next.js ✅

2. **Add PostgreSQL:**
   - In your project → "New" → "Database" → "PostgreSQL"
   - Railway auto-links `DATABASE_URL` ✅

3. **Add Environment Variables:**
   - Click your service → "Variables"
   - Add all required environment variables (same as Vercel)

4. **Deploy:**
   - Railway deploys automatically on push to main
   - Get your URL: `your-app.railway.app`

5. **Custom Domain (Optional):**
   - Settings → "Domains" → Add custom domain
   - Follow DNS instructions

---

## Post-Deployment Checklist

After deploying to any platform:

### 1. Verify Database Connection
```bash
# Check migrations applied
# If Vercel: Check deployment logs
# If self-hosted: docker compose exec app npx prisma migrate status
```

### 2. Test Authentication
- Sign up for a new account
- Verify email sending (if enabled)
- Test login/logout

### 3. Test Core Features
- Create a vault
- Create a note
- Test editor functionality
- Test AI features (if enabled)
- Test file uploads (if enabled)

### 4. Set Up Monitoring (Recommended)

**Vercel:**
- Built-in analytics in dashboard
- Set up error tracking (Sentry integration available)

**Self-hosted:**
- Set up Uptime monitoring (e.g., UptimeRobot)
- Configure log aggregation
- Set up Docker health checks

### 5. Configure Backups

**Managed databases:**
- Check automatic backup settings (usually enabled by default)

**Self-hosted database:**
```bash
# Create backup script
#!/bin/bash
# backup-db.sh
docker compose exec -T db pg_dump -U edfolio edfolio > backup-$(date +%Y%m%d).sql

# Add to crontab for daily backups
0 2 * * * /path/to/backup-db.sh
```

### 6. Security Hardening

- [ ] Set strong AUTH_SECRET (not default)
- [ ] Enable HTTPS only (no HTTP)
- [ ] Set secure headers in next.config.js
- [ ] Enable CORS restrictions if needed
- [ ] Review and rotate API keys regularly
- [ ] Set up rate limiting (Vercel has built-in)
- [ ] Enable database connection pooling

---

## Environment Variables Reference

### Required (Minimum Working Deployment)

| Variable | Example | Where to Get |
|----------|---------|--------------|
| `DATABASE_URL` | `postgresql://...` | Railway/Supabase/Neon |
| `AUTH_SECRET` | `abc123...` | `openssl rand -base64 32` |
| `AUTH_URL` | `https://app.com` | Your domain |

### Optional (Enable Features)

| Variable | Example | Where to Get | Feature |
|----------|---------|--------------|---------|
| `SCW_ACCESS_KEY` | `scw_...` | console.scaleway.com | AI text generation |
| `SCW_SECRET_KEY` | `abc...` | console.scaleway.com | AI text generation |
| `SCW_DEFAULT_ORGANIZATION_ID` | `1a2b...` | console.scaleway.com | AI text generation |
| `SCW_DEFAULT_PROJECT_ID` | `1a2b...` | console.scaleway.com | AI text generation |
| `SCW_REGION` | `fr-par` | console.scaleway.com | AI region |
| `SCALEWAY_ACCESS_KEY` | `SCWX...` | console.scaleway.com/object-storage | File uploads |
| `SCALEWAY_SECRET_KEY` | `abc...` | console.scaleway.com/object-storage | File uploads |
| `SCALEWAY_BUCKET_NAME` | `my-bucket` | console.scaleway.com/object-storage | File uploads |
| `SCALEWAY_REGION` | `fr-par` | console.scaleway.com/object-storage | Storage region |
| `RESEND_API_KEY` | `re_...` | resend.com | Email sending |
| `EMAIL_FROM_ADDRESS` | `noreply@...` | Your domain | Email from |
| `EMAIL_FROM_NAME` | `Edfolio` | Your choice | Email from name |
| `CRON_SECRET` | `abc...` | `openssl rand -base64 32` | Cron job auth |

---

## Troubleshooting

### Issue: Database connection failed

**Symptoms:**
- "Can't reach database server" errors
- 500 errors on all pages

**Solutions:**
1. Verify DATABASE_URL is correct
2. Check database is accessible from deployment platform
3. Verify database credentials
4. Check database firewall allows connections

### Issue: Authentication not working

**Symptoms:**
- Can't sign in
- "Invalid session" errors

**Solutions:**
1. Verify AUTH_SECRET is set and consistent
2. Check AUTH_URL matches your domain
3. Verify cookies are allowed in browser
4. Check HTTPS is enabled (required for secure cookies)

### Issue: AI features not working

**Symptoms:**
- "AI features unavailable" message
- 503 errors on AI endpoints

**Solutions:**
1. Verify all SCW_* environment variables are set
2. Check Scaleway API key is valid
3. Verify region is correct (fr-par or nl-ams)
4. Check Scaleway account has credits

### Issue: Emails not sending

**Symptoms:**
- No password reset emails
- No notification emails

**Solutions:**
1. Check RESEND_API_KEY is set and valid
2. Verify domain is verified in Resend
3. Check email logs in Resend dashboard
4. Test with `onboarding@resend.dev` (works without domain verification)

### Issue: File uploads failing

**Symptoms:**
- Can't upload images
- 500 errors on upload

**Solutions:**
1. Verify all SCALEWAY_* S3 variables are set
2. Check bucket exists and is accessible
3. Verify bucket permissions allow uploads
4. Check S3 credentials are valid

---

## Cost Estimates

### Minimal Setup (Free Tier)

| Service | Free Tier | Cost |
|---------|-----------|------|
| Vercel | 100GB bandwidth | $0 |
| Supabase | 500MB DB | $0 |
| Scaleway AI | €5 credits/month | $0 |
| Resend | 3,000 emails/month | $0 |
| **Total** | | **$0/month** |

### Light Usage (~1,000 users)

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Pro | $20/month |
| Railway | PostgreSQL | $5/month |
| Scaleway AI | Pay-as-you-go | ~$10/month |
| Scaleway S3 | 75GB | $0 (free tier) |
| Resend | Pro | $20/month |
| **Total** | | **~$55/month** |

### Medium Usage (~10,000 users)

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Pro | $20/month |
| Railway | PostgreSQL Pro | $20/month |
| Scaleway AI | Pay-as-you-go | ~$50/month |
| Scaleway S3 | 500GB | ~$10/month |
| Resend | Business | $80/month |
| **Total** | | **~$180/month** |

---

## Additional Resources

- **Vercel Documentation:** https://vercel.com/docs
- **Railway Documentation:** https://docs.railway.app/
- **Scaleway Documentation:** https://www.scaleway.com/en/docs/
- **Resend Documentation:** https://resend.com/docs
- **Docker Setup Guide:** `/docs/DOCKER-SETUP.md`
- **Database Migrations:** `/docs/MIGRATION-WORKFLOW.md`

---

## Need Help?

- Check issues on GitHub
- Review deployment logs for errors
- Join community discussions
- Open a new issue with deployment details

---

**Good luck with your deployment! 🚀**
