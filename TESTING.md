# Testing the app — upload a chart and get analytics

Yes, you can test the full flow: **upload a chart screenshot → get AI analysis** (bias, support/resistance, entry, TP, SL, risk-reward, reasoning).

## What you need

1. **Node.js 18+** (and npm) — [nodejs.org](https://nodejs.org)
2. **PostgreSQL** — running locally or a hosted DB (e.g. [Neon](https://neon.tech), [Supabase](https://supabase.com))
3. **OpenAI API key** — required for chart analysis ([platform.openai.com](https://platform.openai.com/api-keys))

Stripe and BoomFi are **optional** for testing; you get **5 free credits** when you sign up, so you can run 5 analyses without any payment setup.

---

## Steps to run and test

### 1. Install dependencies

```bash
cd c:\Users\knapa\OneDrive\Desktop\chartanalytic
npm install
```

### 2. Environment file

```bash
copy .env.example .env
```

Edit `.env` and set at least:

| Variable | Example | Required for testing |
|----------|---------|----------------------|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/chartanalytic` | Yes |
| `NEXTAUTH_URL` | `http://localhost:3000` | Yes |
| `NEXTAUTH_SECRET` | Any random string (e.g. `openssl rand -base64 32`) | Yes |
| `OPENAI_API_KEY` | `sk-...` from OpenAI | **Yes** (for analysis) |
| Stripe / BoomFi vars | — | No (only for payments) |

### 3. Database

```bash
npx prisma generate
npx prisma db push
```

### 4. Start the app

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

### 5. Create an account and analyze a chart

1. Click **Sign up** and register with email + password.
2. Log in if needed.
3. Go to **Analyze** (or click “Analyze a chart” on the home page).
4. **Upload** a chart screenshot:
   - Click the preview area or use the file input.
   - Use a **PNG, JPEG, or WebP** image (e.g. screenshot of a 5m or 15m chart), **max 10MB**.
5. Click **“Analyze chart”**.
6. Wait a few seconds — the **Results** panel will show:
   - Market bias (Bullish / Bearish / Range)
   - Support and resistance levels
   - Entry, Take profit, Stop loss
   - Risk–reward ratio
   - Short reasoning (price action, trend, momentum)

You start with **5 credits**; each analysis uses 1 credit. Past analyses appear on the **Dashboard** and in the analysis detail page.

---

## If something doesn’t work

- **“OPENAI_API_KEY is not set”** — Add a valid key in `.env` and restart `npm run dev`.
- **Database errors** — Ensure PostgreSQL is running and `DATABASE_URL` is correct; run `npx prisma db push` again.
- **“Insufficient credits”** — New users get 5 credits; after that you’d need to add Stripe/BoomFi or give yourself more credits in the DB for testing.
- **Upload fails** — Use PNG/JPEG/WebP and a file under 10MB; stay logged in.

Once the app is running with a valid DB and `OPENAI_API_KEY`, you can upload a chart screenshot and receive the full chart analytics details as described above.

---

## Automated tests (plan upgrade)

To run unit and API tests for plan upgrade and related logic:

```bash
npm run test
```

This runs Vitest and includes:

- **Plans** (`src/lib/plans.test.ts`): `isUpgrade` (only higher tiers count as upgrade), `getProratedUpgradeAmount` (prorated upgrade amount for remaining period).
- **Upgrade route** (`src/app/api/boomfi/subscription/upgrade/route.test.ts`): auth required, invalid tier, no subscription, missing BoomFi link, same/lower tier rejected, demo mode updates tier without BoomFi, 503 when plan not configured, success path (BoomFi update then local tier update), 502 when BoomFi fails, upgrade to advanced.

Use `npm run test:watch` to run tests in watch mode.
