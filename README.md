# Edfolio

> A modern, privacy-focused portfolio and note-taking application with AI-powered features

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748)](https://www.prisma.io/)

---

## 🚀 Quick Start

Get Edfolio running in **30 seconds** with Docker:

```bash
git clone https://github.com/DarrenJCoxon/edfolio.git
cd edfolio
docker-compose up
```

Open [http://localhost:3000](http://localhost:3000) in your browser. **That's it!** 🎉

> **No setup needed:** Docker automatically configures the database, runs migrations, and starts the dev server with hot reload.

---

## ✨ Features

### Core Features
- **📝 Rich Text Editor** - BlockNote-based editor with Markdown support
- **🗂️ Vault Organization** - Organize notes into secure, isolated vaults
- **🔐 User Authentication** - Secure authentication with NextAuth v5
- **👥 Collaboration** - Share vaults with view-only or full access permissions
- **📱 Responsive Design** - Works seamlessly on desktop, tablet, and mobile

### AI-Powered Features (Optional)
- **🤖 AI Text Generation** - Generate content with EU-based Scaleway AI
- **✍️ Smart Rephrasing** - Improve clarity and tone
- **📊 Summarization** - Extract key points from long notes

### Privacy & Compliance
- **🇪🇺 GDPR Compliant** - All data stays in EU (France/Netherlands)
- **🔒 Data Residency** - EU-based infrastructure (Scaleway)
- **🚫 No Tracking** - Your data stays yours

---

## 📋 Prerequisites

### For Docker (Recommended)
- **Docker Desktop** - [Install Docker](https://docs.docker.com/get-docker/)
- That's it!

### For Non-Docker Development
- **Node.js** 20+ - [Download Node.js](https://nodejs.org/)
- **pnpm** 8+ - Install with `corepack enable`
- **PostgreSQL** 16+ - [Download PostgreSQL](https://www.postgresql.org/download/)

---

## 🛠️ Installation

### Option 1: Docker (Recommended)

**1. Clone the repository:**
```bash
git clone https://github.com/DarrenJCoxon/edfolio.git
cd edfolio
```

**2. Copy environment template (optional):**
```bash
cp .env.example .env
# Edit .env if you want to enable AI/email features (optional)
```

**3. Start with Docker:**
```bash
docker-compose up
```

**4. Open your browser:**
```
http://localhost:3000
```

The first startup takes 2-3 minutes to build. Subsequent starts are faster (~10 seconds).

**Docker commands:**
```bash
# Start in background
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop containers
docker-compose down

# Fresh start (deletes database)
docker-compose down -v && docker-compose up
```

### Option 2: Traditional Setup

**1. Clone and install:**
```bash
git clone https://github.com/DarrenJCoxon/edfolio.git
cd edfolio
pnpm install
```

**2. Set up database:**
```bash
# Ensure PostgreSQL is running
# Create database (if needed)
createdb edfolio

# Copy and configure environment
cp .env.example .env
# Edit DATABASE_URL in .env to match your PostgreSQL setup
```

**3. Run migrations:**
```bash
npx prisma migrate deploy
npx prisma generate
```

**4. Start dev server:**
```bash
pnpm dev
```

**5. Open your browser:**
```
http://localhost:3000
```

---

## 🔧 Configuration

### Environment Variables

See [`.env.example`](.env.example) for full documentation.

**Required for production:**
```bash
DATABASE_URL=postgresql://...      # PostgreSQL connection string
AUTH_URL=https://your-domain.com   # Your production URL
AUTH_SECRET=<generate-with-openssl> # Secret for auth tokens
```

**Optional (enable features):**
```bash
# AI Features (Scaleway)
SCW_ACCESS_KEY=...
SCW_SECRET_KEY=...
SCW_DEFAULT_ORGANIZATION_ID=...
SCW_DEFAULT_PROJECT_ID=...
SCW_REGION=fr-par

# File Uploads (Scaleway S3)
SCALEWAY_ACCESS_KEY=...
SCALEWAY_SECRET_KEY=...
SCALEWAY_BUCKET_NAME=...
SCALEWAY_REGION=fr-par

# Email (Resend)
RESEND_API_KEY=...
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME=Edfolio
```

**Get API keys (all have free tiers):**
- Scaleway AI: https://console.scaleway.com/
- Resend Email: https://resend.com/

### Feature Flags

By default, Docker runs with minimal configuration:
- ✅ Database (auto-configured)
- ✅ Authentication (auto-configured)
- ⚠️ AI features (disabled without API keys)
- ⚠️ File uploads (disabled without API keys)
- ⚠️ Email (logs to console without API keys)

The app works fully without optional services!

---

## 🌐 Deployment

### Deploy to Vercel (Recommended)

**1. Set up a database:**
- [Railway](https://railway.app) (recommended)
- [Supabase](https://supabase.com)
- [Neon](https://neon.tech)
- [Vercel Postgres](https://vercel.com/storage/postgres)

**2. Deploy to Vercel:**
- Fork this repo
- Import to [Vercel](https://vercel.com)
- Add environment variables (DATABASE_URL, AUTH_SECRET)
- Deploy!

**3. Enable optional features:**
- Add Scaleway API keys for AI
- Add Resend API key for emails

**Full deployment guide:** See [`/docs/DEPLOYMENT.md`](/docs/DEPLOYMENT.md)

### Self-Host with Docker

**1. Set up server:**
```bash
# Install Docker on your server
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

**2. Clone and configure:**
```bash
git clone https://github.com/DarrenJCoxon/edfolio.git
cd edfolio
cp .env.example .env
# Edit .env with production values
```

**3. Deploy:**
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

**Full self-hosting guide:** See [`/docs/DEPLOYMENT.md`](/docs/DEPLOYMENT.md)

---

## 📚 Documentation

- **[Docker Setup Guide](/docs/DOCKER-SETUP.md)** - Local development with Docker
- **[Deployment Guide](/docs/DEPLOYMENT.md)** - Production deployment
- **[Migration Workflow](/docs/MIGRATION-WORKFLOW.md)** - Database migration workflow
- **[Development Standards](/CLAUDE.md)** - Code standards and best practices

---

## 🏗️ Tech Stack

### Frontend
- **[Next.js 14](https://nextjs.org/)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS
- **[shadcn/ui](https://ui.shadcn.com/)** - Re-usable UI components
- **[BlockNote](https://www.blocknotejs.org/)** - Rich text editor

### Backend
- **[Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)** - Serverless API
- **[Prisma](https://www.prisma.io/)** - Type-safe ORM
- **[PostgreSQL](https://www.postgresql.org/)** - Relational database
- **[NextAuth v5](https://authjs.dev/)** - Authentication

### AI & Services
- **[Scaleway AI](https://www.scaleway.com/en/ai/)** - EU-based AI inference (GDPR compliant)
- **[Scaleway Object Storage](https://www.scaleway.com/en/object-storage/)** - S3-compatible file storage
- **[Resend](https://resend.com/)** - Transactional email service

### DevOps
- **[Docker](https://www.docker.com/)** - Containerization
- **[Docker Compose](https://docs.docker.com/compose/)** - Multi-container orchestration
- **[pnpm](https://pnpm.io/)** - Fast, efficient package manager

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

**1. Fork and clone:**
```bash
git clone https://github.com/your-username/edfolio.git
cd edfolio
```

**2. Create a branch:**
```bash
git checkout -b feature/your-feature-name
```

**3. Make your changes:**
```bash
# Start development environment
docker-compose up

# Make your changes...
# Follow code standards in CLAUDE.md

# Run tests (when available)
pnpm test

# Run linter
pnpm lint
```

**4. Commit and push:**
```bash
git add .
git commit -m "Add your feature"
git push origin feature/your-feature-name
```

**5. Open a Pull Request**

### Development Standards

Please read [`CLAUDE.md`](/CLAUDE.md) for detailed development standards including:
- Code style and formatting
- Component structure
- TypeScript usage
- Database migration workflow
- Testing requirements

---

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run linter
pnpm lint

# Fix linting issues
pnpm lint:fix
```

---

## 📊 Project Structure

```
edfolio/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (main)/            # Main application pages
│   ├── api/               # API routes
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── editor/           # Editor components
│   └── navigation/       # Navigation components
├── lib/                   # Utility functions
│   ├── prisma.ts         # Prisma client singleton
│   ├── auth.ts           # Auth utilities
│   └── utils.ts          # Helper functions
├── prisma/               # Database schema and migrations
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Migration files
├── public/               # Static assets
├── docs/                 # Documentation
│   ├── DOCKER-SETUP.md   # Docker guide
│   ├── DEPLOYMENT.md     # Deployment guide
│   └── MIGRATION-WORKFLOW.md  # Database workflow
├── types/                # TypeScript types
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Local development
└── CLAUDE.md            # Development standards
```

---

## 🐛 Troubleshooting

### "Port 3000 already in use"
```bash
# Find and kill process using port 3000
lsof -i :3000
kill -9 <PID>

# OR change port in docker-compose.yml
```

### "Database connection failed"
```bash
# Check database is running
docker-compose ps

# Check logs
docker-compose logs db

# Restart database
docker-compose restart db
```

### "Hot reload not working"
```bash
# Restart app container
docker-compose restart app

# OR rebuild
docker-compose up --build
```

**More troubleshooting:** See [`/docs/DOCKER-SETUP.md`](/docs/DOCKER-SETUP.md#troubleshooting-guide)

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Editor powered by [BlockNote](https://www.blocknotejs.org/)
- Authentication by [NextAuth](https://authjs.dev/)
- Infrastructure by [Scaleway](https://www.scaleway.com/) (EU GDPR-compliant)

---

## 📧 Support

- **Documentation:** Check [`/docs`](/docs) folder
- **Issues:** Open an issue on GitHub
- **Discussions:** Join GitHub Discussions

---

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Offline mode with sync
- [ ] Advanced collaboration features
- [ ] Plugin system
- [ ] CLI for note management
- [ ] Desktop app (Electron)

---

**Made with ❤️ for privacy-conscious note-takers**

[⬆ Back to top](#edfolio)
