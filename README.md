# ILUNI FTE WebApps

Alumni Database & Networking Platform untuk Ikatan Alumni Fakultas Teknik Program Studi Teknik Elektro Universitas Pakuan Bogor (ILUNI FT ELEKTRO UNPAK). Dibangun dengan Next.js 14, Supabase, dan Bun.

| | |
|---|---|
| **Aplikasi (Production)** | [https://ilunifteunpak.vercel.app](https://ilunifteunpak.vercel.app) |
| **User Manual (Dokumentasi)** | [https://ilunifteunpakinfra-spec.github.io/webapps/](https://ilunifteunpakinfra-spec.github.io/webapps/) |
| **Database** | Supabase (PostgreSQL) |

> **Arsitektur Deployment**
>
> - Branch `main` → **Vercel** (production app, di-deploy otomatis oleh Vercel Git Integration)
> - Branch `docs` → **GitHub Pages** (User Manual VitePress + PDF, via `.github/workflows/deploy-docs.yml`)
> - Vercel hanya memproses branch `main` (lihat `vercel.json` `ignoreCommand`); semua branch lain termasuk `docs` di-skip.

## 📋 Features

- **Alumni Database** - Profil alumni dengan visibilitas (public/alumni_only/private)
- **Skills & Endorsements** - Sistem skill dan endorsemen antar alumni
- **Mentoring** - Program mentoring alumni → mentee
- **Job Board** - Lowongan kerja dari alumni
- **Referral System** - Sistem referral dengan privasi
- **Announcements** - Pengumuman untuk alumni
- **Groups** - Grup berdasarkan angkatan atau minat
- **Polls** - Polling untuk alumni
- **Event Gallery** - Galeri foto event

## 🚀 Quick Start

### Prerequisites

- **Bun** >= 1.3.14 ([install here](https://bun.sh))
- **Node.js** >= 18.x
- **Supabase Account** ([sign up here](https://supabase.com))
- **Vercel Account** ([sign up here](https://vercel.com))

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/ilunifteunpakinfra-spec/webapps.git
cd webapps

# 2. Run setup script
bun run setup

# 3. Update .env file with your credentials
nano .env

# 4. Start development server
bun dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app.

## 📁 Project Structure

```
.
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin dashboard
│   ├── daftar/            # Registration page
│   ├── direktori/         # Alumni directory
│   ├── grup/              # Groups
│   ├── login/             # Login page
│   ├── lowongan/          # Job listings
│   ├── mentoring/         # Mentoring program
│   ├── polling/           # Polls
│   ├── profil/            # User profiles
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable React components
│   └── Navbar.tsx
├── lib/                   # Utility libraries
│   └── supabase/          # Supabase clients
│       ├── client.ts      # Browser client
│       └── server.ts      # Server client
├── public/                # Static assets
├── supabase/              # Database schema
│   └── schema.sql         # Complete database schema
├── docs/                  # User Manual (VitePress) — cabang `docs`
│   ├── .vitepress/        # VitePress config & navigasi
│   ├── latest/            # Halaman dokumentasi (Markdown)
│   ├── scripts/           # Skrip generate PDF (Playwright)
│   └── public/pdfs/       # PDF per halaman + manual-latest.pdf
├── .github/workflows/     # CI/CD (deploy docs → GitHub Pages, keep-alive Supabase)
├── scripts/               # Setup & deployment scripts
│   ├── setup.sh           # Development setup
│   ├── deploy.sh          # Deploy everything
│   ├── deploy-supabase.sh # Deploy database
│   └── deploy-vercel.sh   # Deploy to Vercel
├── .env.example           # Environment variables template
├── .env                   # Your environment variables (DO NOT COMMIT)
├── vercel.json            # Vercel config (skip build untuk branch non-main)
├── package.json           # Dependencies & scripts
└── bun.lock              # Bun lock file
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ACCESS_TOKEN=your-access-token
SUPABASE_PROJECT_ID=your-project-id

# Vercel
VERCEL_API_TOKEN=your-vercel-token
VERCEL_PROJECT_ID=your-project-id
VERCEL_TEAM_ID=your-team-id

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### How to get credentials:

1. **Supabase:**

   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Create a new project
   - Go to Settings → API to get:
     - Project URL
     - Anon/Public key
     - Service role key
   - Go to Account → Tokens to get Access Token
2. **Vercel:**

   - Go to [Vercel Dashboard](https://vercel.com)
   - Go to Settings → Tokens to create API token
   - Deploy the app once manually to get Project ID and Team ID

## 💻 Development

### Available Scripts

```bash
# Start development server
bun dev

# Build for production
bun run build

# Start production server
bun run start

# Run linter
bun run lint

# Run setup script
bun run setup

# Deploy everything
bun run deploy

# Deploy only Supabase
bun run deploy:supabase

# Deploy only Vercel
bun run deploy:vercel
```

### Database Schema

The database schema is in `supabase/schema.sql`. It includes:

- **15 tables** (alumni, skills, endorsements, mentoring, jobs, etc.)
- **Row Level Security (RLS)** policies for data privacy
- **Indexes** for performance optimization
- **Triggers** for auto-updating timestamps
- **Seed data** for initial skills

### Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Runtime:** Bun
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Language:** TypeScript

## 🚢 Deployment

### Arsitektur CI/CD

| Branch | Tujuan | Mekanisme |
|---|---|---|
| `main` | **Vercel — Production** (`https://ilunifteunpak.vercel.app`) | Vercel Git Integration (`productionBranch: main`); branch lain di-skip via `vercel.json` `ignoreCommand` |
| `docs` | **GitHub Pages** (`https://ilunifteunpakinfra-spec.github.io/webapps/`) | `.github/workflows/deploy-docs.yml` — build VitePress, generate PDF, push ke branch `gh-pages` |
| PR ke `docs` | Build check (preview) | Job `preview-check` di `deploy-docs.yml` (tanpa deploy) |

### User Manual (Dokumentasi)

User Manual dikelola sebagai **Docs-as-Code** dengan VitePress di branch `docs`:

```bash
# Build & preview dokumentasi secara lokal
git checkout docs
cd docs
npm ci
npm run dev        # http://localhost:5173
npm run build      # build statis
npm run pdf        # generate PDF (butuh server preview aktif)
```

Setiap push ke branch `docs` otomatis: build VitePress → generate PDF per halaman + `manual-latest.pdf` → publish ke GitHub Pages. File PDF hasil CI di-commit kembali ke branch `docs`.

### Option 1: Automated Deployment (Recommended)

```bash
# Make sure you have filled in .env with correct values
bun run deploy
```

This will:

1. Deploy database schema to Supabase
2. Build and deploy the app to Vercel

### Option 2: Manual Deployment

```bash
# Deploy database schema
bun run deploy:supabase

# Deploy to Vercel
bun run deploy:vercel
```

### Option 3: Using CLI Directly

```bash
# Push schema
supabase db push --project-ref YOUR_PROJECT_ID

# Deploy to Vercel
vercel --prod
```

## 🔐 Security

- All environment variables are stored in `.env` (never commit this file)
- Supabase RLS policies enforce data privacy
- Admin bypass for verification/moderation
- Service role key only used server-side

## 👤 Creating Admin Users

To create an admin user with elevated privileges:

```bash
# Run the admin creation script
bash scripts/create-admin.sh
```

This will prompt you for:
- Email address (used for login)
- Password (minimum 6 characters)
- Full name
- Role: `super_admin` or `admin`

The script uses Supabase Admin API (via `SUPABASE_SERVICE_ROLE_KEY`) to create the user with the specified role stored in `user_metadata`.

**Admin Roles:**
- `super_admin` - Full access to all features including user verification
- `admin` - Limited admin access (can be customized in RLS policies)

**Login:** Use the created credentials at `http://localhost:3000/login`

## 🧪 Testing

```bash
# Run development server
bun dev

# Test locally at http://localhost:3000
# Test admin features at http://localhost:3000/admin
```

## 📝 Scripts Documentation

### `scripts/setup.sh`

Automated development setup:

- Checks Bun installation
- Creates `.env` from `.env.example`
- Installs dependencies
- Installs Supabase & Vercel CLIs

### `scripts/deploy.sh`

Complete deployment:

- Runs Supabase deployment
- Runs Vercel deployment

### `scripts/deploy-supabase.sh`

Database deployment:

- Links to Supabase project
- Pushes schema changes
- Shows database dashboard link

### `scripts/deploy-vercel.sh`

App deployment:

- Pulls Vercel project config
- Builds the project
- Deploys to production

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test locally with `bun dev`
4. Run linter: `bun run lint`
5. Commit and push

## 📄 License

Private - ILUNI FT ELEKTRO UNPAK

## 👥 Team

- **Developed by:** ILUNI FT ELEKTRO UNPAK Development Team
- **Repository:** [github.com/ilunifteunpakinfra-spec/webapps](https://github.com/ilunifteunpakinfra-spec/webapps)

## 🔗 Links

- **Aplikasi (Production):** [https://ilunifteunpak.vercel.app](https://ilunifteunpak.vercel.app)
- **User Manual (GitHub Pages):** [https://ilunifteunpakinfra-spec.github.io/webapps/](https://ilunifteunpakinfra-spec.github.io/webapps/)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Vercel Dashboard](https://vercel.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Last Updated:** 2026-08-10
**Version:** 2.0.0
