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

Binance Spot `myTrades` requires a `symbol`, so the app cannot fetch every trade with one global request. The connect page now supports:

- Full market scan: discovers active Spot symbols from `exchangeInfo` and scans them one by one.
- Broad quote scan: scans symbols for selected quote assets such as USDT, BTC, BNB, and TRY.
- Quick selected scan: scans only chosen symbols for faster tests.

Full scan has the best coverage but can take several minutes on real accounts.

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

