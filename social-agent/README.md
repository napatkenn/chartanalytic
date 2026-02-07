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
node social-agent/run.js gbpusd
node social-agent/run.js xauusd
node social-agent/run.js usdjpy
node social-agent/run.js audusd

# Post chart only, no AI analysis (no OPENAI_API_KEY needed)
node social-agent/run.js eurusd --no-analyze

# Test full flow without posting (capture + analyze + show post text)
node social-agent/run.js eurusd --dry-run
```

**Post format (X):** Short, high-impact forex post with symbol | timeframe, bias (%), key level line, targets, and 3–5 forex hashtags. Example:
```
EUR/USD | 1H
Bias: Bearish (75%)
Below 1.2000 = sellers in control
Targets: 1.1940 → 1.1810

#forex #trading #fx #technicalanalysis #forexsignals
```

## Scheduling (cron / Task Scheduler)

**Linux/macOS (cron):**
```cron
0 7 * * *  cd /path/to/chartanalytic && node social-agent/run.js
0 12 * * * cd /path/to/chartanalytic && node social-agent/run.js
0 15 * * * cd /path/to/chartanalytic && node social-agent/run.js
0 17 * * * cd /path/to/chartanalytic && node social-agent/run.js
0 20 * * * cd /path/to/chartanalytic && node social-agent/run.js
```

**Windows (Task Scheduler):** Create five tasks for 07:00, 12:00, 15:00, 17:00, 20:00 UTC, action: `node C:\path\to\chartanalytic\social-agent\run.js`.

## Test: TradingView → app flow

```bash
node social-agent/test-tradingview-to-app.js eurusd   # capture + send to app
node social-agent/test-tradingview-to-app.js          # use latest image, send to app
node social-agent/test-tradingview-to-app.js eurusd --capture-only  # capture only
```

## Notes

- **TradingView**: Charts are loaded in a headless browser. TradingView may rate-limit or block automated access; if captures fail, try running less frequently or with a headed browser.
- **Output**: Screenshots are written to `social-agent/output/` (gitignored).

## References

- [X Developer API](https://developer.x.com)
- [TradingView](https://www.tradingview.com/)
