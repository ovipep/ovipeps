# OVIpeps — Deployment Guide

## Vercel + Turso (Recommended)

OVIpeps uses **Turso** (libSQL) for production — a serverless SQLite-compatible database that works on Vercel.

### 1. Create Turso Database

```bash
# Install Turso CLI: https://docs.turso.tech/cli
turso auth login
turso db create ovipeps --region yyz
turso db show ovipeps --url
turso db tokens create ovipeps
```

### 2. Push Schema to Turso

```bash
export TURSO_DATABASE_URL="libsql://..."
export TURSO_AUTH_TOKEN="..."
npx prisma db push
npm run db:seed
```

### 3. Vercel Environment Variables

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Description |
|----------|-------------|
| `TURSO_DATABASE_URL` | Turso database URL |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `AUTH_SECRET` | Random 32+ char string for NextAuth |
| `NEXTAUTH_URL` | Your production URL (e.g. https://ovipeps.vercel.app) |

### 4. Deploy

```bash
vercel --prod
```

## Local Development

Uses SQLite at `prisma/dev.db`:

```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

## Demo Credentials

- Admin: `admin@ovipeps.ca` / `admin123`
- Customer: `demo@ovipeps.ca` / `demo123`
