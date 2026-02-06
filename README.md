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
2. **Register** — The app needs a **database**. SQLite (`file:./prisma/dev.db`) does **not** work on Vercel (read-only filesystem). Use **PostgreSQL**:
   - Add a Postgres database (e.g. [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), Neon, or Supabase).
   - In Prisma, switch to Postgres: in `prisma/schema.prisma` set `provider = "postgresql"` and `url = env("DATABASE_URL")`.
   - Run `npx prisma generate` and `npx prisma db push` (or migrate) against the new DB, then set `DATABASE_URL` in Vercel to the Postgres connection string.
   - Redeploy.

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
