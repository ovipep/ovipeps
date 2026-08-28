# OVIPeps — Deployment Guide

## Vercel + Supabase

OVIPeps uses **Supabase Postgres** for production. The Supabase Vercel Marketplace
integration securely synchronizes the database credentials with the Vercel project.

### 1. Create and connect Supabase

In Vercel, open the OVIPeps project, select **Storage**, create a Supabase
database, and connect it to Production and Preview.

### 2. Apply the schema

```bash
export POSTGRES_URL_NON_POOLING="postgres://..."
npx prisma db push
npm run db:seed
```

### 3. Vercel Environment Variables

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Description |
|----------|-------------|
| `POSTGRES_PRISMA_URL` | Pooled Supabase Postgres URL used by the deployed app |
| `POSTGRES_URL` | Supabase Postgres connection URL |
| `POSTGRES_URL_NON_POOLING` | Direct/session Supabase URL used for schema changes |
| `AUTH_SECRET` | Random 32+ char string for NextAuth |
| `NEXTAUTH_URL` | Your production URL (e.g. https://ovipeps.vercel.app) |

### 4. Deploy

```bash
vercel --prod
```

## Local Development

Local development uses a separate Supabase development project or Postgres database:

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

## Seed Account Passwords

Set `SEED_ADMIN_PASSWORD` and `SEED_DEMO_PASSWORD` in the environment before
running `npm run db:seed`. Never commit account passwords to the repository.
