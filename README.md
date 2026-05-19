# 2BMTRADE

A secure, read-only Binance trade analytics dashboard with an AI coach (Gemini), anonymous peer discovery, and risk insights. Built with Next.js 15, React 19, Prisma 6, Tailwind, and PostgreSQL.

**Live demo:** [hackathon.mertgungor.me](https://hackathon.mertgungor.me)

## Features

- Read-only Binance Spot, USD-M Futures, and COIN-M Futures sync with background job polling
- AI coach powered by Gemini 2.5 (chat + structured reports)
- Anonymous trader profile registry — only public ratios and behavioral labels are stored, never raw trades or keys
- Insights: PnL, drawdown, win rate, holding period, asset concentration
- Google OAuth authentication
- Per-route rate limiting (Upstash Redis)
- Error and performance monitoring (Sentry)
- Production security headers (HSTS, X-Frame-Options, etc.)

## Security Model

- Read-only Binance keys only — backend rejects keys with trading or withdrawal permission
- API secrets are submitted only to backend route handlers; never logged
- No trading, withdrawal, transfer, or account-modifying endpoints
- All routes that touch user data are gated by NextAuth session
- API endpoints are rate-limited per user / IP

## Quick Start (local)

```bash
npm install
cp .env.example .env
# Fill in DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, GEMINI_API_KEY
npm run db:push
npm run dev
```

Open `http://localhost:3000`.

## Production Deployment

This project deploys to **Vercel** with **Neon** (Postgres), **Upstash** (Redis rate limit), and **Sentry** (monitoring).

### 1. Database — Neon

1. Create a project at [neon.tech](https://neon.tech)
2. Copy both the **pooled** and **direct** connection strings
3. Push the schema:
   ```bash
   DATABASE_URL="<direct-url>" npx prisma db push
   ```

### 2. Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com) → Credentials → Create OAuth Client (Web application)
2. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://hackathon.mertgungor.me/api/auth/callback/google`
3. Copy Client ID and Client Secret into `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`

### 3. Upstash Redis

1. Create a Redis database at [upstash.com](https://upstash.com)
2. Copy the REST URL and REST Token into env

### 4. Sentry

1. Create a Next.js project at [sentry.io](https://sentry.io)
2. Copy DSN into `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`

### 5. Vercel

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new)
2. Set all env vars from `.env.example` in **Settings → Environment Variables**
3. Production branch: `main`
4. Build command (auto): `npm run build` (runs `prisma generate && next build`)

### 6. Custom domain (Squarespace DNS)

1. In Vercel → Project → Settings → Domains, add `hackathon.mertgungor.me`
2. In Squarespace → Settings → Domains → DNS, add a CNAME record:
   - Host: `hackathon`
   - Points to: `cname.vercel-dns.com`
3. Wait for DNS propagation (usually under 10 minutes). SSL is provisioned automatically by Vercel.

## Trade Coverage

Binance Spot and Futures trade-list endpoints require a `symbol`, so the app cannot fetch every fill with one global request. The connect page supports:

- Markets: Spot, USD-M Futures, and COIN-M Futures
- Progress jobs: sync starts in the background; the frontend polls a job endpoint for symbol count, current symbol, trades found, and completion
- Full market scan: discovers active symbols from `exchangeInfo` and scans them one by one
- Broad quote scan: scans symbols for selected quote assets (USDT, BTC, BNB, TRY, etc.)
- Quick selected scan: scans only chosen symbols for faster tests

Full scan has the best coverage but can take several minutes on real accounts. USD-M Futures user trade history is limited by Binance to the recent futures history window exposed by their endpoint.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router, RSC) |
| Language | TypeScript 5.8 |
| Styling | Tailwind 3.4 |
| DB | PostgreSQL via Prisma 6 |
| Auth | NextAuth v5 (Auth.js) + Google |
| Rate limit | Upstash Redis + @upstash/ratelimit |
| AI | Google Gemini 2.5 Flash |
| Monitoring | Sentry + Vercel Analytics |
| Hosting | Vercel |

## Scripts

```bash
npm run dev          # local dev server
npm run build        # production build (runs prisma generate first)
npm run start        # production server
npm run typecheck    # TypeScript check
npm run db:push      # push Prisma schema to DB (dev)
npm run db:migrate   # run pending migrations (production)
```
