# ChartAnalytic

AI-powered trading chart analysis: upload 5–15 minute chart screenshots and get structured analysis (bias, levels, entry, TP, SL, R:R, reasoning). Dark, trader-focused UI with auth, credits, and payments.

## Features

- **Chart analysis**: Upload PNG/JPEG/WebP; get market bias, support/resistance, entry, TP, SL, risk-reward, and short reasoning.
- **Auth**: Email/password (NextAuth).
- **Credits**: Free tier + credit-based usage; buy credits via **Stripe** (card) or **BoomFi** (crypto).
- **Dashboard**: Past analyses, remaining credits, timestamps.
- **Legal disclaimer**: Not financial advice (shown in UI).

## Tech stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind.
- **Backend**: Next.js API routes, Prisma, PostgreSQL.
- **AI**: OpenAI (GPT-4o vision) for chart analysis.
- **Payments**: Stripe (card), [BoomFi](https://docs.boomfi.xyz/docs/pay-links) (crypto one-time and recurring).

## Quick test (upload chart → get analytics)

You get **5 free credits** on signup. To test the full flow (upload screenshot → get bias, levels, entry, TP, SL, reasoning), see **[TESTING.md](./TESTING.md)** for step-by-step instructions.

## Setup

1. **Install and env**

   ```bash
   npm install
   cp .env.example .env
   # Edit .env with your keys
   ```

2. **Database**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. **Run**

   ```bash
   npm run dev
   ```

## BoomFi (crypto payments)

[BoomFi](https://docs.boomfi.xyz/docs/pay-links) is used for **crypto payment links** (one-time and recurring).

1. **Merchant account**: Sign up at [BoomFi](https://app.boomfi.xyz/dashboard) and complete settlement setup.
2. **API key**: In the dashboard → API, create an API key. Set `BOOMFI_API_KEY` in `.env`.
3. **Webhook** (to grant credits after payment):
   - In dashboard → Integration → Webhooks, add a webhook URL: `https://your-domain.com/api/boomfi/webhook`
   - Subscribe to payment events (e.g. **Payment.Updated**).
   - Copy the **webhook signing public key** (PEM) and set `BOOMFI_WEBHOOK_PUBLIC_KEY` in `.env`.
4. **Verification**: BoomFi signs webhooks with `X-BoomFi-Timestamp` and `X-BoomFi-Signature`. The app verifies the signature and credits the user using `customer.reference` (we send your user id as `customer_ident` when creating the pay link).

**Recurring subscriptions (crypto) — required for “Subscribe” to work**  
The app requires three **recurring plans** in BoomFi (Starter, Active, Advanced). If **Subscribe** returns 503:

1. **API key**: In BoomFi dashboard → API, create an API key and set in `.env`:
   ```env
   BOOMFI_API_KEY="your_key"
   ```
2. **Create 3 plans** in BoomFi (Pay Links or Plans):
   - **Starter**: $2.99, recurring every 7 days
   - **Active**: $9.99, recurring every 30 days
   - **Advanced**: $29.99, recurring every 30 days
3. Copy each plan’s ID and set in `.env`:
   ```env
   BOOMFI_PLAN_ID_STARTER="plan_..."
   BOOMFI_PLAN_ID_ACTIVE="plan_..."
   BOOMFI_PLAN_ID_ADVANCED="plan_..."
   ```
4. **Webhook**: Add `https://your-domain.com/api/boomfi/webhook` in BoomFi → Webhooks and set `BOOMFI_WEBHOOK_PUBLIC_KEY` in `.env` so the app can activate subscriptions after payment.
5. Restart the dev server after changing `.env`.

## Stripe (card payments)

Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_ID_CREDITS` (a Price ID for a one-time product). Point Stripe webhook to `/api/stripe/webhook` and subscribe to `checkout.session.completed`.

## Deploying to Vercel (chart images)

Uploaded chart images must be stored in **persistent storage** on Vercel; the serverless filesystem is ephemeral, so files written in one request are not available in another. To avoid `NOT_FOUND` for chart images:

1. **Add Blob storage**
   - In the [Vercel Dashboard](https://vercel.com/dashboard): open your project → **Storage** → **Create Database** (or **Connect Store**).
   - Choose **Blob** and create a new Blob store (name it e.g. `chartanalytic-uploads`).
   - Vercel will add the env var `BLOB_READ_WRITE_TOKEN` to the project automatically.

2. **Redeploy**
   - Trigger a new deployment (e.g. push to your connected Git branch, or run `vercel --prod`).
   - New uploads will be stored in Blob and their URLs will work across all requests.

3. **Old analyses**
   - Analyses created before Blob was enabled may have chart images that no longer exist. The app shows a friendly “Chart image no longer available” message in that case; the text results (support, resistance, entry, etc.) remain.
   - To clear old upload URLs in the database (stops 404s for those analyses), run once with your production `DATABASE_URL`: **`npm run db:clear-old-uploads`**

Optional: set `STORAGE_BASE_URL` in Vercel env if you want to serve uploads from a CDN (e.g. a custom domain in front of Blob).

## Deploying to Render

The app and scheduled jobs run on **Render** using the Blueprint in `render.yaml`.

1. **Connect the repo**  
   [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** → connect your Git repo and select the repo that contains `render.yaml`.

2. **Environment variables**  
   For each service (web + cron jobs), set the env vars in the Render Dashboard (or use an [Environment Group](https://render.com/docs/environment-groups)). Variables marked `sync: false` in `render.yaml` will prompt you to add values. Include at least:
   - **Web service**: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and any Stripe/BoomFi/OpenAI/Blob keys you use.
   - **Polymarket cron**: `OPENAI_API_KEY`, `POLYMARKET_PRIVATE_KEY`, `POLYMARKET_API_KEY`, `POLYMARKET_API_SECRET`, `POLYMARKET_PASSPHRASE`; **`PROXY_URL`** (required on Render — Polymarket blocks US; use an HTTP proxy in an allowed region, e.g. EU); optionally `POLYMARKET_MAX_SIZE_USD`, `POLYMARKET_MIN_CONFIDENCE`.
   - **Social cron**: `OPENAI_API_KEY`, `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`, `CHART_ANALYTIC_URL`, `ANALYZE_IMAGE_SECRET`.

3. **Database**  
   Use Render Postgres or an external Postgres (e.g. Neon, Supabase). Set `DATABASE_URL` on the web service. Run migrations (e.g. `npx prisma db push`) once against that database.

4. **Chart uploads on Render**  
   The web service uses the same filesystem for the request lifecycle. If you need persistent uploads across restarts, use Vercel Blob (set `BLOB_READ_WRITE_TOKEN`) or another storage and configure the app accordingly.

**Scheduled jobs (social agent)**  
- **Polymarket cron**: runs at :00, :15, :30, :45 UTC (`node social-agent/run.js --predict`).  
- **Social cron**: runs at 07:00, 12:00, 15:00, 17:00, 20:00 UTC (`node social-agent/run.js`).  

See [social-agent/README.md](./social-agent/README.md) for env vars and usage.

### If you get 404 on the root URL or other pages

1. **Deployment Protection** — In Vercel: Project → **Settings** → **Deployment Protection**. If **Vercel Authentication** (or password protection) is enabled, unauthenticated visitors get 401/redirect and can see 404 in some flows. For a public site, turn protection **Off** for Production (or use “Only Preview” and keep Production public).
2. **Framework and build** — **Settings** → **General**: **Framework Preset** should be **Next.js**. **Build Command** should be `next build` (or empty to use default). **Output Directory** must be **empty** (Next.js uses `.next`; do not set e.g. `out` unless you use static export).
3. **Production deployment** — **Deployments**: ensure the deployment that works (e.g. latest successful build) is assigned to **Production**. If Production points at an old or failed deployment, you’ll see 404.
4. **Redeploy** — After changing code or config, push to the connected branch or trigger **Redeploy** so the live URL uses the latest build.

### Login and register on Vercel

If **login does nothing** or you see NextAuth errors, or **registration shows "Registration failed"**:

1. **Login** — NextAuth needs a secret in production. In Vercel → **Settings** → **Environment Variables** add:
   - `NEXTAUTH_SECRET` — any long random string (e.g. run `openssl rand -base64 32` and paste the result).
   - `NEXTAUTH_URL` — your app URL, e.g. `https://chartanalytic.vercel.app` (or leave unset and set `AUTH_TRUST_HOST=true` for preview URLs).
   - `AUTH_TRUST_HOST` — set to `true` so sign-in works on preview deployment URLs.
2. **Register** — The app uses **PostgreSQL** (schema is already set to `postgresql`). On Vercel you must set `DATABASE_URL` to a Postgres connection string:
   - Create a Postgres database: [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), [Neon](https://neon.tech), or [Supabase](https://supabase.com) (all have free tiers).
   - Copy the connection string (e.g. `postgresql://user:pass@host/db?sslmode=require`).
   - In Vercel → **Settings** → **Environment Variables**, add `DATABASE_URL` with that value (Production and Preview).
   - Locally, run `npx prisma db push` (or `prisma migrate deploy`) with the same URL in `.env` to create tables. Then redeploy on Vercel.

## Environment summary

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | NextAuth (set both on Vercel: URL = your app URL e.g. `https://chartanalytic.vercel.app`; secret = any random string). Set `AUTH_TRUST_HOST=true` on Vercel so login works on preview URLs. |
| `OPENAI_API_KEY` | Chart analysis |
| `STRIPE_*` | Card checkout & webhook |
| `BOOMFI_API_KEY` | Create crypto pay links (required for Subscribe) |
| `BOOMFI_PLAN_ID_STARTER`, `_ACTIVE`, `_ADVANCED` | Recurring plan IDs from BoomFi (required for Subscribe) |
| `BOOMFI_WEBHOOK_PUBLIC_KEY` | Verify BoomFi webhooks and activate subscriptions |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (set automatically when you add Blob storage); required for chart uploads on Vercel |
| `STORAGE_BASE_URL` | Optional: base URL for serving uploads (e.g. CDN) |

## Disclaimer

This app is for educational and informational use only. It does not constitute financial, investment, or trading advice. See the in-app disclaimer.
