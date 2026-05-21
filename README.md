# FranDeal — Next.js App

Franchise resale marketplace with FDD data built in.

## Project structure

```
frandeal/
├── app/
│   ├── page.tsx                    → redirects to /browse
│   ├── browse/page.tsx             → public listing browse
│   ├── dashboard/page.tsx          → buyer dashboard (auth required)
│   ├── pricing/page.tsx            → pricing + Stripe checkout
│   └── api/
│       ├── auth/route.ts           → POST register/login, GET me
│       ├── billing/route.ts        → POST checkout/portal, GET status
│       ├── billing/webhook/        → POST Stripe webhook (raw body)
│       ├── listings/route.ts       → GET listings with filters
│       ├── listings/[id]/route.ts  → GET listing detail
│       ├── listings/[id]/reveal/   → POST reveal broker contact
│       ├── fdd/[name]/route.ts     → GET FDD data by brand name
│       ├── alerts/route.ts         → GET/POST search alerts
│       ├── alerts/[id]/route.ts    → PATCH/DELETE individual alert
│       ├── saved/route.ts          → GET saved listings
│       ├── saved/[id]/route.ts     → POST/DELETE save a listing
│       └── cron/
│           ├── scrape-listings/    → daily listing scrape (BBS + FG)
│           ├── send-alerts/        → 30-min alert email runner
│           └── trial-reminders/    → daily trial-ending emails
├── lib/
│   ├── db.ts                       → Postgres pool + typed query helpers
│   ├── auth.ts                     → JWT helpers + requireAuth middleware
│   └── billing.ts                  → Stripe helpers + webhook handler
├── components/
│   ├── BrowsePage.tsx              → public browse page (from BrowsePage.jsx)
│   ├── Dashboard.tsx               → buyer dashboard
│   └── PricingPage.tsx             → pricing + plan cards
└── scripts/
    ├── migrate.js                  → npm run db:migrate
    ├── scrape-listings.js          → npm run scrape:listings
    ├── scrape-fdd.js               → npm run scrape:fdd
    └── send-alerts.js              → npm run alerts:run
```

External modules (keep as sibling folders or copy into the project):
- `fdd-scraper/`    — Wisconsin DFI scraper
- `ca-mn-scrapers/` — California + Minnesota scrapers
- `listing-scraper/`— BizBuySell + FranchiseGator scrapers
- `fdd-db/`         — SQL migrations + db.js helpers
- `email-alerts/`   — email templates + alert runner
- `stripe-billing/` — Stripe setup script

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.local.example .env.local
# Fill in all values — see comments in the file
```

### 3. Create Stripe products (once)
```bash
STRIPE_SECRET_KEY=sk_live_... node stripe-billing/setup-stripe.js
# Copy the printed price IDs into .env.local
```

### 4. Run database migrations
```bash
npm run db:migrate
```

### 5. Seed initial data
```bash
npm run scrape:fdd        # scrapes FDD data for franchises.txt brands
npm run scrape:listings   # scrapes BizBuySell + FranchiseGator
```

### 6. Start dev server
```bash
npm run dev
# http://localhost:3000
```

---

## Deploy to Vercel

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "initial"
gh repo create frandeal --public --push

# 2. Deploy
npx vercel

# 3. Add environment variables in Vercel dashboard
#    Settings → Environment Variables → paste from .env.local

# 4. Add Stripe webhook
#    Stripe Dashboard → Developers → Webhooks → Add endpoint
#    URL: https://frandeal.com/api/billing/webhook
#    Events: subscription.created/updated/deleted, invoice.payment_succeeded/failed
#    Copy signing secret → add as STRIPE_WEBHOOK_SECRET in Vercel

# 5. Add custom domain
#    Vercel Dashboard → Settings → Domains → frandeal.com
```

---

## Adding components

The three UI components need to be placed in `components/`:

```bash
# BrowsePage.jsx → components/BrowsePage.tsx
# (rename + add 'use client' at top if not already there)

# The dashboard and pricing page widgets from Claude
# can be saved as components/Dashboard.tsx and
# components/PricingPage.tsx respectively
```

---

## API reference

| Method | Path | Auth | Plan |
|--------|------|------|------|
| POST | /api/auth?action=register | — | — |
| POST | /api/auth?action=login | — | — |
| GET | /api/auth | Bearer | — |
| POST | /api/billing?action=checkout | Bearer | — |
| POST | /api/billing?action=portal | Bearer | Any |
| GET | /api/billing | Bearer | Any |
| POST | /api/billing/webhook | Stripe sig | — |
| GET | /api/listings | Optional | Free+ |
| GET | /api/listings/:id | Optional | Free+ |
| POST | /api/listings/:id/reveal | Bearer | Starter+ |
| GET | /api/fdd/:name | — | — |
| GET | /api/alerts | Bearer | Starter+ |
| POST | /api/alerts | Bearer | Starter+ |
| PATCH | /api/alerts/:id | Bearer | Starter+ |
| DELETE | /api/alerts/:id | Bearer | Starter+ |
| GET | /api/saved | Bearer | Starter+ |
| POST | /api/saved/:id | Bearer | Starter+ |
| DELETE | /api/saved/:id | Bearer | Starter+ |
