# Chart social posting agent

This agent captures TradingView charts at scheduled UTC times, optionally runs AI analysis, and posts to X (Twitter) via the **X Developer API** (no third-party posting service).

## Posting to X (X Developer API)

**One-time setup:** [developer.x.com](https://developer.x.com) → create a project and app → **Keys and tokens**: copy **API Key**, **API Secret**, then **Generate** Access Token and Access Token Secret for the account that will tweet.

In `.env`:
```env
X_API_KEY=your_api_key
X_API_SECRET=your_api_secret
X_ACCESS_TOKEN=your_access_token
X_ACCESS_TOKEN_SECRET=your_access_token_secret
```

Free tier limits apply (e.g. 200 tweets per 15 min per user). Tweet text is truncated to 280 characters.

## Schedule (UTC)

| Time (UTC)     | Pair     | Timeframe | Frequency   |
|----------------|----------|-----------|-------------|
| 07:00          | EUR/USD  | 1H        | once        |
| 12:00          | GBP/USD  | 15m       | once        |
| 15:00          | XAU/USD  | 15m       | once        |
| 17:00          | USD/JPY  | 1H        | once        |
| 20:00          | AUD/USD  | 4H        | once        |
| **:00, :15, :30, :45** | BTC/USDT, ETH/USDT, SOL/USDT | 1M | **every 15 min** (Polymarket) |

## Requirements

- **Node.js** 18+
- **Puppeteer** (installed via project: `npm install`)
- **X API credentials** (see above)
- **Analysis:** set CHART_ANALYTIC_URL + ANALYZE_IMAGE_SECRET to use the app, or OPENAI_API_KEY; use `--no-analyze` to post chart only

## Environment variables

Add to your `.env`:

```env
# X (Twitter) API — from developer.x.com app Keys and tokens
X_API_KEY=your_api_key
X_API_SECRET=your_api_secret
X_ACCESS_TOKEN=your_access_token
X_ACCESS_TOKEN_SECRET=your_access_token_secret

# Analysis via Chart Analytic app (optional)
CHART_ANALYTIC_URL=http://localhost:3000
ANALYZE_IMAGE_SECRET=your-secret-matching-app-env
# Or OpenAI directly
OPENAI_API_KEY=sk-...
```

- **X_API_KEY**, **X_API_SECRET**, **X_ACCESS_TOKEN**, **X_ACCESS_TOKEN_SECRET** — From [developer.x.com](https://developer.x.com) → your app → Keys and tokens. Generate Access Token for the account that will post.
- **CHART_ANALYTIC_URL** — Your Chart Analytic app URL. With **ANALYZE_IMAGE_SECRET**, the captured image is analyzed via the app (same as photo upload).
- **ANALYZE_IMAGE_SECRET** — Must match the app’s `ANALYZE_IMAGE_SECRET`.

## Usage

From the **project root**:

```bash
# Run all schedules due at the current UTC hour
node social-agent/run.js

# Run a single schedule by id
node social-agent/run.js eurusd
node social-agent/run.js btc
node social-agent/run.js eth
node social-agent/run.js sol
node social-agent/run.js xrp
node social-agent/run.js gbpusd
node social-agent/run.js xauusd
node social-agent/run.js usdjpy
node social-agent/run.js audusd

# Post chart only, no AI analysis (no OPENAI_API_KEY needed)
node social-agent/run.js eurusd --no-analyze

# Test full flow without posting (capture + analyze + show post text)
node social-agent/run.js eurusd --dry-run

# Crypto 1M: capture + analyze + (optional) place prediction on Polymarket
node social-agent/run.js btc --predict
node social-agent/run.js eth --predict --dry-run   # dry-run: no X post, no real Polymarket order
```

**Post format (X):** Short, high-impact forex post with symbol | timeframe, bias (%), key level line, targets, and 3–5 forex hashtags. Example:
```
EUR/USD | 1H
Bias: Bearish (75%)
Below 1.2000 = sellers in control
Targets: 1.1940 → 1.1810

#forex #trading #fx #technicalanalysis #forexsignals
```

## Running on Render (scheduled cron)

Scheduled runs use **Render** cron jobs defined in the repo root **`render.yaml`** (Blueprint).

1. **Deploy:** In the [Render Dashboard](https://dashboard.render.com), create a **Blueprint** from this repo. Render will create the web service plus **polymarket-cron** and **social-cron** from `render.yaml`.
2. **Env vars:** For each cron job, set environment variables in the Render Dashboard (or use an [Environment Group](https://render.com/docs/environment-groups)):
   - **Polymarket cron:** `OPENAI_API_KEY`, `POLYMARKET_PRIVATE_KEY`; optional: `POLYMARKET_API_KEY`, `POLYMARKET_API_SECRET`, `POLYMARKET_PASSPHRASE`, **`PROXY_URL`** (see geoblock note below), `POLYMARKET_MAX_SIZE_USD`, `POLYMARKET_MIN_CONFIDENCE`.
   - **Social cron:** `OPENAI_API_KEY`, `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`; optional: `CHART_ANALYTIC_URL`, `ANALYZE_IMAGE_SECRET`.
3. **Schedules:** **Polymarket:** every 15 min (:00, :15, :30, :45 UTC). **Social:** 7, 12, 15, 17, 20 UTC. You can trigger runs manually from the Render Dashboard.

**Polymarket geoblock:** Render runs in a region you choose; [Polymarket blocks orders from the US and other regions](https://docs.polymarket.com/api-reference/geoblock). If your Render region is blocked, set **`PROXY_URL`** (HTTP proxy in an allowed country, e.g. `http://user:pass@host:port`). Only **HTTP** proxies are supported (not SOCKS). See **[CRON-GEOBLOCK.md](../CRON-GEOBLOCK.md)** for options.

## Scheduling (local cron / Task Scheduler)

**Linux/macOS (cron) — every 15 min for crypto + forex at their hours:**
```cron
0,15,30,45 * * * *  cd /path/to/chartanalytic && node social-agent/run.js --predict
```

**Windows (Task Scheduler):** Create a task that runs every 15 minutes (e.g. at :00, :15, :30, :45), action: `node C:\path\to\chartanalytic\social-agent\run.js --predict`.

## Polymarket prediction bot (optional)

For **BTC**, **ETH**, and **SOL** 1-minute schedules you can place predictions on [Polymarket](https://polymarket.com) based on the chart analysis (bullish/bearish + confidence).

1. **Wallet:** Create or use an Ethereum wallet; fund it with **USDC.e on Polygon** (and a little POL for gas). Export the **private key** (0x...).
2. **Env:** In `.env` set:
   - `POLYMARKET_PRIVATE_KEY=0x...` (required to place orders)
   - `POLYMARKET_MIN_CONFIDENCE=65` (optional; default 65 — only predict when analysis confidence ≥ this)
   - `POLYMARKET_MAX_SIZE_USD=10` (optional; max $ per order)
3. **Run:** Use `--predict` when running a crypto schedule so that after analysis the bot looks up a matching Polymarket market (e.g. “Bitcoin”) and places a limit order: **Yes** if bullish, **No** if bearish (skips if bias is “range” or confidence is below threshold).

The bot **prefers 15-minute “Up or Down” markets** for Bitcoin, Ethereum, Solana, and XRP. It uses [Polymarket event slugs](https://polymarket.com/event/btc-updown-15m-1771670700) (e.g. `btc-updown-15m-1771670700`): it tries GET /markets/slug/{slug}, then GET /events?slug={slug} to get the event’s market. Default slugs are set to a specific 15-min window; when that window closes, set **POLYMARKET_MARKET_SLUGS** with current slugs from the Polymarket event URLs (e.g. `btc:btc-updown-15m-1771670800,eth:eth-updown-15m-1771670800,sol:sol-updown-15m-1771670800,xrp:xrp-updown-15m-1771670800`). Run `node social-agent/test-polymarket.js` to confirm 15-min markets are found.

When you use **`--predict`**, the run is **Polymarket-only**: no post to X (or other social). The AI analysis uses a **15-minute–specific prompt** (“Will price be UP or DOWN at the end of the next 15 minutes?”) so the prediction aligns with Polymarket’s 15m Up/Down markets. Example: `node social-agent/run.js btc --predict` captures the chart, runs the 15m analysis, and places a Polymarket order when confidence is high enough. Use `--dry-run` to test without placing real orders. **15-min prompt requires OPENAI_API_KEY** (the Chart Analytic app API uses the general prompt).

### Full Polymarket run (capture → analyze → predict)

- **Dry-run (no X post, no real order):**  
  `npm run social-agent:polymarket-dry` or  
  `node social-agent/run.js btc --predict --dry-run`  
  Uses Puppeteer + OpenAI (or app), captures BTC 1m chart, runs analysis, then logs what it *would* place on Polymarket. No wallet or X keys needed.
- **Live (real order):**  
  Set `POLYMARKET_PRIVATE_KEY` and optionally `POLYMARKET_MAX_SIZE_USD=1` in `.env`, then  
  `npm run social-agent:polymarket` or  
  `node social-agent/run.js btc --predict`  
  Same flow but places a real limit order when confidence ≥ threshold. Add X API keys in `.env` if you want the chart post to X as well.

### Testing the Polymarket flow

1. **Market discovery only** (no API key, no wallet):
   ```bash
   node social-agent/test-polymarket.js
   ```
   Checks that Gamma API returns active Bitcoin / Ethereum / Solana markets and prints question + token IDs.

2. **Full pipeline dry-run** (capture + analyze + “would place” order; no X post, no real order):
   ```bash
   node social-agent/run.js btc --predict --dry-run
   ```
   Requires Puppeteer and `OPENAI_API_KEY` (or Chart Analytic app). Runs real chart capture and AI analysis; Polymarket step is simulated.

3. **Order logic dry-run** (no Puppeteer, no OpenAI; uses fake analysis):
   ```bash
   node social-agent/test-polymarket.js --dry
   ```
   Calls `placePrediction` with mock analysis in dry-run mode. No wallet needed; confirms “Would place YES/NO $X on …”.

4. **Real small order** (wallet required):
   ```bash
   POLYMARKET_MAX_SIZE_USD=1 node social-agent/test-polymarket.js --live
   ```
   Or run the full pipeline and place a real order: `node social-agent/run.js btc --predict` (set `POLYMARKET_MAX_SIZE_USD=1` in `.env` for testing).

**Risk:** Trading and prediction markets involve loss of capital. Use small sizes and only what you can afford to lose.

## Notes

- **TradingView**: Charts are loaded in a headless browser. If you see "Navigation timeout exceeded", set `CAPTURE_NAV_TIMEOUT_MS=120000` (default 60s) or use `waitUntil: "load"` (already set; avoids TradingView’s persistent connections blocking `networkidle2`). If TradingView blocks headless access, run with a visible browser: `CAPTURE_HEADED=true node social-agent/run.js btc --predict --dry-run`.
- **Output**: Screenshots are written to `social-agent/output/` (gitignored).
- **X 403 on media upload**: In the [X Developer Portal](https://developer.x.com), ensure your app has **Read and write** (or **Read and write and Direct messages**) access and that the app is not in **Read only** mode. **Regenerate the Access Token** after changing permissions (old tokens do not get new permissions). If you still get 403, the script will show the API error message and will try a fallback upload format (base64); see [X 403 Forbidden discussion](https://devcommunity.x.com/t/403-forbidden-in-any-request/234743).

## References

- [X Developer API](https://developer.x.com)
- [TradingView](https://www.tradingview.com/)
