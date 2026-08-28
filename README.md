# OVIPeps

Premium Canadian research-peptide e-commerce platform built with Next.js 16, Prisma, and SQLite.

## Features

- **E-commerce** — Shop, product detail, cart, checkout with Interac e-Transfer workflow
- **COA Library** — Batch/lot searchable lab results database
- **Peptide Calculator** — Research reconstitution utility
- **Research Hub** — Educational articles, FAQs, and resources
- **Affiliate Platform** — Partner program with attribution, commissions, and monthly payouts
- **Admin Dashboard** — Orders, products, COAs, affiliates, announcements, settings
- **Customer Accounts** — Order history, tracking, settings

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Run migrations and seed
npx prisma migrate dev
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Seed Account Passwords

Seed account passwords must be supplied through the `SEED_ADMIN_PASSWORD` and
`SEED_DEMO_PASSWORD` environment variables. Never commit account passwords.

## Key Routes

| Route | Description |
|-------|-------------|
| `/` | Homepage |
| `/shop` | Product catalog with filters |
| `/shop/[slug]` | Product detail |
| `/lab-results` | COA library |
| `/calculator` | Peptide calculator |
| `/research` | Research hub |
| `/checkout` | Checkout (Interac e-Transfer) |
| `/affiliates` | Partner program |
| `/account` | Customer dashboard |
| `/admin` | Admin dashboard |

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database:** Supabase Postgres via Prisma 7
- **Auth:** NextAuth.js v5 (credentials)
- **Styling:** Tailwind CSS v4
- **State:** Zustand (cart)
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts (affiliate dashboard)

## Order Workflow

1. Customer places order → status `AWAITING_PAYMENT`
2. E-transfer instructions displayed + emailed
3. Admin confirms payment → status `PAYMENT_RECEIVED` → `PROCESSING`
4. Affiliate commission created only after payment confirmation
5. Order shipped → `SHIPPED` → `COMPLETED`

## Affiliate System

- Referral URLs: `/?r=OVI-CODE`
- Attribution window: configurable (default 30 days)
- Commission hold period before payout eligibility
- Monthly payout reports with CSV export
- Fraud flags for manual review (never auto-accuse)

## Production Deployment

1. Connect the Supabase Vercel Marketplace integration
2. Set `AUTH_SECRET` to a secure random string
3. Configure Resend for transactional emails (`src/lib/emails.ts`)
4. Add GTM/GA4 and connect `src/lib/analytics.ts` events
5. Review legal/compliance content before launch

## Compliance Note

All products are sold for research purposes only. Legal and regulatory review is required before production launch. The site does not make unsupported medical, therapeutic, or purity claims.
