# Chart social posting agent

This agent captures TradingView charts at scheduled UTC times, optionally runs AI analysis, and posts to social media via [Postiz](https://github.com/gitroomhq/postiz-app). **Use the self-hosted version so you don’t need any keys or account from postiz.com.**

## Self-hosted Postiz (no postiz.com keys)

1. Run Postiz yourself: [Install with Docker](https://github.com/gitroomhq/postiz-app#quick-start) (or Docker Compose / your host).
2. Set **POSTIZ_API_URL** to your backend + path, e.g. `https://postiz.yourdomain.com/public/v1` (see Postiz docs: `NEXT_PUBLIC_BACKEND_URL` + `/public/v1`).
3. In your Postiz UI go to **Settings → API** and create an API key. Set **POSTIZ_API_KEY** to that value.
4. Connect your social account (X, LinkedIn, etc.) in Postiz and set **POSTIZ_INTEGRATION_ID** to that integration’s ID (from the UI or [List Integrations](https://docs.postiz.com/public-api/integrations/list) when logged in).

No postiz.com signup or cloud API key is required.

## Schedule (UTC)

| Time (UTC) | Pair    | Timeframe | Chart URL |
|------------|---------|-----------|-----------|
| 07:00      | EUR/USD | 1H        | [TradingView](https://www.tradingview.com/chart/?symbol=FX:EURUSD&interval=60) |
| 12:00      | GBP/USD | 15m       | [TradingView](https://www.tradingview.com/chart/?symbol=FX:GBPUSD&interval=15) |
| 15:00      | XAU/USD | 15m       | [TradingView](https://www.tradingview.com/chart/?symbol=OANDA:XAUUSD&interval=15) |
| 17:00      | USD/JPY | 1H        | [TradingView](https://www.tradingview.com/chart/?symbol=FX:USDJPY&interval=60) |
| 20:00      | AUD/USD | 4H        | [TradingView](https://www.tradingview.com/chart/?symbol=OANDA:AUDUSD&interval=240) |

## Requirements

- **Node.js** 18+
- **Puppeteer** (installed via project: `npm install`)
- **Postiz self-hosted** (recommended) or Postiz cloud — API key from your instance (Settings → API) and integration ID
- **Analysis:** set CHART_ANALYTIC_URL + ANALYZE_IMAGE_SECRET to use the app, or OPENAI_API_KEY; use `--no-analyze` to post chart only

## Environment variables

Add to your `.env` (or set in the shell before running). **Self-hosted (recommended):**

```env
# Self-hosted Postiz — your instance URL (path /public/v1) and API key from Settings → API
POSTIZ_API_URL=https://your-postiz.example.com/public/v1
POSTIZ_API_KEY=your-api-key-from-your-postiz-settings
POSTIZ_INTEGRATION_ID=your-integration-id

# Analysis via Chart Analytic app (recommended)
CHART_ANALYTIC_URL=http://localhost:3000
ANALYZE_IMAGE_SECRET=your-secret-matching-app-env
# Or OpenAI directly
OPENAI_API_KEY=sk-...
```

- **CHART_ANALYTIC_URL** — Your Chart Analytic app URL (e.g. `http://localhost:3000`). With **ANALYZE_IMAGE_SECRET**, the captured image is analyzed via the app (same as photo upload).
- **ANALYZE_IMAGE_SECRET** — Must match the app’s `ANALYZE_IMAGE_SECRET`. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
- **POSTIZ_API_URL** — Your Postiz backend URL ending with `/public/v1`.
- **POSTIZ_API_KEY** — From your Postiz instance: **Settings → API**.
- **POSTIZ_INTEGRATION_ID** — The connected channel ID (X, LinkedIn, etc.) in Postiz.

## Analysis via Chart Analytic app

When **CHART_ANALYTIC_URL** and **ANALYZE_IMAGE_SECRET** are set, the agent sends the captured TradingView image to your app’s `/api/analyze-image` and uses the returned data (entry, TP, SL, TP2, SL2, confidence, reasoning) for the post caption — the same pipeline as uploading a chart in the UI, without using credits or saving to a user.

## Usage

From the **project root** (so `.env` is loaded and `node_modules` is available):

```bash
# Run all schedules due at the current UTC hour
node social-agent/run.js

# Run a single schedule by id
node social-agent/run.js eurusd
node social-agent/run.js gbpusd
node social-agent/run.js xauusd
node social-agent/run.js usdjpy
node social-agent/run.js audusd

# Post chart only, no AI analysis (no OPENAI_API_KEY needed)
node social-agent/run.js eurusd --no-analyze
```

## Scheduling (cron / Task Scheduler)

To run at the correct UTC times, schedule the script.

**Linux/macOS (cron, 0–23 UTC):**

```cron
0 7 * * *  cd /path/to/chartanalytic && node social-agent/run.js
0 12 * * * cd /path/to/chartanalytic && node social-agent/run.js
0 15 * * * cd /path/to/chartanalytic && node social-agent/run.js
0 17 * * * cd /path/to/chartanalytic && node social-agent/run.js
0 20 * * * cd /path/to/chartanalytic && node social-agent/run.js
```

**Windows (Task Scheduler):** Create five tasks, one per time (07:00, 12:00, 15:00, 17:00, 20:00 UTC), action: `node C:\path\to\chartanalytic\social-agent\run.js`.

**Vercel Cron:** You can expose an API route that runs the agent and call it from [Vercel Cron](https://vercel.com/docs/cron-jobs); the route must authenticate (e.g. CRON_SECRET) and run the capture/post logic or shell out to the script.

## Test: TradingView → app flow

To verify how the image is captured and sent to your app:

```bash
# 1. Capture from TradingView and (if env set) send to app
node social-agent/test-tradingview-to-app.js eurusd

# 2. Use latest image in output/ and send to app (no new capture)
node social-agent/test-tradingview-to-app.js

# 3. Only capture, do not call app
node social-agent/test-tradingview-to-app.js eurusd --capture-only
```

Step 1 saves the chart to `social-agent/output/test-flow-eurusd-<timestamp>.png`. If `CHART_ANALYTIC_URL` and `ANALYZE_IMAGE_SECRET` are set and the app is running, the script then POSTs that image to `/api/analyze-image` and prints the analysis. Otherwise it only runs the capture and reminds you to set the env vars.

## Notes

- **TradingView**: Charts are loaded in a headless browser. TradingView may rate-limit or block automated access; if captures fail, try running less frequently or with a headed browser / different IP.
- **Postiz**: Supports 21+ platforms (X, LinkedIn, etc.). Set `POSTIZ_INTEGRATION_ID` to the account you want. For multiple accounts, extend `postiz.js` to accept an integration id per run.
- **Output**: Screenshots are written to `social-agent/output/` (gitignored). You can delete them after posting to save space.

## References

- [Postiz app](https://github.com/gitroomhq/postiz-app)
- [Postiz Public API](https://docs.postiz.com/public-api/introduction)
- [TradingView](https://www.tradingview.com/)
