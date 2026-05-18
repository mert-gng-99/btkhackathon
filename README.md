# Binance Trade Analytics MVP

A secure, read-only Binance Spot trade analytics dashboard built with Next.js, TypeScript, Tailwind CSS, and PostgreSQL-ready Prisma models.

## Security Model

- The MVP supports Binance Spot read-only analysis.
- API secrets are submitted only to backend route handlers.
- API secrets are not stored in the MVP temporary-session flow.
- The backend rejects keys that appear to have trading or withdrawal permission.
- No trading, withdrawal, transfer, or account-modifying Binance endpoints are implemented.
- Logs and errors must not include API secrets.

## Trade Coverage

Binance Spot and Futures trade-list endpoints require a `symbol`, so the app cannot fetch every fill with one global request. The connect page supports:

- Markets: Spot, USD-M Futures, and COIN-M Futures.
- Progress jobs: sync starts in the background and the frontend polls a job endpoint for symbol count, current symbol, trades found, and completion.
- Full market scan: discovers active symbols from `exchangeInfo` and scans them one by one.
- Broad quote scan: scans symbols for selected quote assets such as USDT, BTC, BNB, and TRY. Futures first uses income history to discover active symbols where possible.
- Quick selected scan: scans only chosen symbols for faster tests.

Full scan has the best coverage but can take several minutes on real accounts. USD-M Futures user trade history is limited by Binance to the recent futures history window exposed by their endpoint.

## Quick Start

```bash
npm.cmd install
copy .env.example .env
npm.cmd run dev
```

Open `http://localhost:3000`.

## Environment

Set `DATABASE_URL` when enabling PostgreSQL persistence. The current MVP uses an in-memory temporary session store so the app can run quickly for demos.

RAG reference material can later be placed in `rag-materials/` as `.md` or `.txt` files.

Gemini agents use server-side environment variables:

```env
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-2.5-flash"
GEMINI_API_BASE_URL="https://generativelanguage.googleapis.com/v1beta"
```

After editing `.env`, restart the dev server.

