/**
 * Run chart analysis on an image file.
 * Prefers OpenAI direct (OPENAI_API_KEY) when set — avoids Vercel blocking cron requests.
 * Falls back to Chart Analytic app API when CHART_ANALYTIC_URL + ANALYZE_IMAGE_SECRET are set (no OPENAI_API_KEY).
 */

const fs = require("fs").promises;
const path = require("path");

function normalizeAppUrl(url) {
  if (!url || !url.trim()) return "http://localhost:3000";
  const u = url.trim().replace(/\/$/, "");
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `https://${u}`;
}

/** Analyze via Chart Analytic app: POST image to /api/analyze-image. Does not support forPolymarket15m (use OPENAI_API_KEY for that). */
async function analyzeImageViaApp(imagePath, _options = {}) {
  const baseUrl = normalizeAppUrl(process.env.CHART_ANALYTIC_URL || "http://localhost:3000");
  const secret = process.env.ANALYZE_IMAGE_SECRET;
  if (!secret) throw new Error("ANALYZE_IMAGE_SECRET is not set for Chart Analytic API");

  const buffer = await fs.readFile(imagePath);
  const formData = new FormData();
  formData.append("chart", new Blob([buffer], { type: "image/png" }), path.basename(imagePath) || "chart.png");

  const res = await fetch(`${baseUrl}/api/analyze-image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    const isBlocked = res.status === 429 || (text && text.includes("Vercel Security Checkpoint"));
    if (isBlocked) {
      throw new Error(
        "Chart Analytic API blocked (429 / Vercel Security Checkpoint). Set OPENAI_API_KEY (e.g. in GitHub Actions secrets or .env) so the cron uses OpenAI directly and does not call Vercel."
      );
    }
    let err;
    try {
      err = JSON.parse(text).error || text;
    } catch {
      err = text.slice(0, 200);
    }
    throw new Error(`Chart Analytic API: ${res.status} ${err}`);
  }

  const data = await res.json();
  if (!data.analysis) throw new Error("Chart Analytic API: missing analysis in response");
  const analysis = data.analysis;
  if (analysis.confidence != null) {
    const n = Number(analysis.confidence);
    analysis.confidence = Math.min(100, Math.max(0, Number.isFinite(n) ? Math.round(n) : 0));
  }
  return analysis;
}

const ANALYSIS_PROMPT = `You are an expert technical analyst. Analyze the provided trading chart screenshot.

Return a structured analysis in the following JSON format only (no markdown, no code block):
{
  "marketBias": "bullish" | "bearish" | "range",
  "support": ["level1", "level2"],
  "resistance": ["level1", "level2"],
  "entry": "suggested entry price or zone",
  "takeProfit": "primary TP level",
  "stopLoss": "primary SL level",
  "takeProfit2": "optional second TP level",
  "stopLoss2": "optional second SL level",
  "riskReward": "e.g. 1:2 or 1:1.5",
  "confidence": 0-100 integer (whole number; how sure you are about the bias),
  "reasoning": "2-4 sentences on price action, trend, and momentum",
  "symbol": "trading pair if visible",
  "timeframe": "timeframe if visible"
}

Focus on clarity and actionable levels. Use exact numbers from the chart when visible.`;

const ANALYSIS_PROMPT_15M = `You are an expert technical analyst. This image is a 1-minute chart. Your task is to predict ONLY whether the price will be UP or DOWN at the end of the NEXT 15 MINUTES (higher or lower than the current/latest price on the chart).

Return a structured analysis in the following JSON format only (no markdown, no code block):
{
  "marketBias": "bullish" | "bearish",
  "support": ["level1", "level2"],
  "resistance": ["level1", "level2"],
  "entry": "current or last visible price",
  "takeProfit": "brief",
  "stopLoss": "brief",
  "riskReward": "e.g. 1:1",
  "confidence": 0-100 integer and precise for example 66, 72, 89, 99 (how sure you are about UP vs DOWN in the next 15 min; must be a whole number),
  "reasoning": "2-3 sentences focused on why price will be UP or DOWN in the next 15 minutes only. Consider momentum, recent candles, and key levels.",
  "symbol": "trading pair if visible",
  "timeframe": "1m"
}

Rules: Use ONLY "bullish" (for UP) or "bearish" (for DOWN). Do not use "range". Confidence must be an integer 0-100  and precise for example 66, 72, 89, 99 etc, and reflect how sure you are about the next 15-minute direction (e.g. 55 = slight edge, 70 = fairly confident, 85 = high conviction).`;

/** Analyze via OpenAI directly (same logic as main app). */
async function analyzeImageOpenAI(imagePath, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Either set OPENAI_API_KEY (e.g. GitHub Actions secrets or .env), or use Chart Analytic app by setting CHART_ANALYTIC_URL and ANALYZE_IMAGE_SECRET."
    );
  }

  const forPolymarket15m = Boolean(options.forPolymarket15m);
  const systemPrompt = forPolymarket15m ? ANALYSIS_PROMPT_15M : ANALYSIS_PROMPT;

  const buffer = await fs.readFile(imagePath);
  const base64 = buffer.toString("base64");
  const dataUrl = `data:image/png;base64,${base64}`;

  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey });
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 800,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [{ type: "image_url", image_url: { url: dataUrl } }],
      },
    ],
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error("Empty AI response");
  const jsonStr = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  const parsed = JSON.parse(jsonStr);
  if (forPolymarket15m && parsed.marketBias === "range") {
    parsed.marketBias = parsed.confidence >= 50 ? "bullish" : "bearish";
  }
  // Normalize confidence to 0-100 integer (model may return float or out-of-range)
  if (parsed.confidence != null) {
    const n = Number(parsed.confidence);
    parsed.confidence = Math.min(100, Math.max(0, Number.isFinite(n) ? Math.round(n) : 0));
  }
  return parsed;
}

/**
 * Analyze image: prefer OpenAI direct (avoids Vercel blocking cron). Else use Chart Analytic app.
 * @param {string} imagePath
 * @param {{ forPolymarket15m?: boolean }} options - When true, use prompt optimized for "next 15 min up/down" (requires OPENAI_API_KEY).
 */
async function analyzeImage(imagePath, options = {}) {
  const forPolymarket15m = Boolean(options.forPolymarket15m);
  if (forPolymarket15m && process.env.OPENAI_API_KEY) {
    return analyzeImageOpenAI(imagePath, { forPolymarket15m: true });
  }
  if (forPolymarket15m) {
    throw new Error("Polymarket 15-min mode requires OPENAI_API_KEY (app API does not support 15m prompt).");
  }
  if (process.env.OPENAI_API_KEY) {
    return analyzeImageOpenAI(imagePath, {});
  }
  const baseUrl = process.env.CHART_ANALYTIC_URL;
  const secret = process.env.ANALYZE_IMAGE_SECRET;
  if (baseUrl && secret) {
    return analyzeImageViaApp(imagePath, options);
  }
  return analyzeImageOpenAI(imagePath, {}); // throws clear error about OPENAI_API_KEY
}

// --- Caption: posting rules (no identical text; 40%+ lexical variation; 10 hashtags, 3–5 per post; 4 random formats) ---

const HASHTAG_POOL = [
  "#forex",
  "#trading",
  "#fx",
  "#technicalanalysis",
  "#forexsignals",
  "#tradingview",
  "#chartanalysis",
  "#daytrading",
  "#supportresistance",
  "#tradingcharts",
];

/** Pick a random count between min and max (inclusive) from pool, return space-separated string. */
function pickHashtags(pool, minCount, maxCount) {
  const count = minCount + Math.floor(Math.random() * (maxCount - minCount + 1));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).join(" ");
}

function pickOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getPair(schedule, analysis) {
  const symbol = (schedule.name || analysis.symbol || "FX").replace(/\s*\/\s*/g, "/").trim();
  const tf = (schedule.timeframe || analysis.timeframe || "").toUpperCase();
  return `${symbol} | ${tf}`;
}

function getBiasWord(analysis) {
  const b = (analysis.marketBias || "range").toLowerCase();
  return b === "bullish" ? "Bullish" : b === "bearish" ? "Bearish" : "Range";
}

function getConfidenceSuffix(analysis) {
  if (analysis.confidence == null) return "";
  return pickOne([
    ` (${analysis.confidence}%)`,
    ` — ${analysis.confidence}%`,
    ` ${analysis.confidence}% confidence`,
  ]);
}

/** Bias line with random label. */
function getBiasLine(analysis) {
  const label = pickOne(["Bias:", "View:", "Outlook:", "Market:"]);
  return `${label} ${getBiasWord(analysis)}${getConfidenceSuffix(analysis)}`;
}

/** Level line with random phrasing (multi-line style). */
function getLevelLine(analysis) {
  const res = analysis.resistance && analysis.resistance[0];
  const sup = analysis.support && analysis.support[0];
  const bias = (analysis.marketBias || "range").toLowerCase();
  if (bias === "bearish" && res) {
    return pickOne([
      `Below ${res} = sellers in control`,
      `Sellers in control below ${res}`,
      `Key resistance ${res}`,
    ]);
  }
  if (bias === "bullish" && sup) {
    return pickOne([
      `Above ${sup} = buyers in control`,
      `Buyers in control above ${sup}`,
      `Key support ${sup}`,
    ]);
  }
  if (bias === "range" && sup && res) {
    return pickOne([
      `Between ${sup}–${res} = range`,
      `Range ${sup}–${res}`,
      `Key zone ${sup}–${res}`,
    ]);
  }
  if (res) return pickOne([`Key level: ${res}`, `Level: ${res}`]);
  if (sup) return pickOne([`Key level: ${sup}`, `Level: ${sup}`]);
  return "";
}

/** Short level phrase for one-liner (e.g. "Key level 1.08"). */
function getLevelShort(analysis) {
  const res = analysis.resistance && analysis.resistance[0];
  const sup = analysis.support && analysis.support[0];
  if (res) return `Key level ${res}`;
  if (sup) return `Key level ${sup}`;
  return "";
}

/** Targets line with random label. */
function getTargetsLine(analysis) {
  const targets = [analysis.takeProfit, analysis.takeProfit2].filter(Boolean);
  if (!targets.length) return "";
  const label = pickOne(["Targets:", "TP:", "Take profit:", "Aims:"]);
  return `${label} ${targets.join(" → ")}`;
}

/** Targets as short phrase for one-liner (e.g. "TP 1.09"). */
function getTargetsShort(analysis) {
  const targets = [analysis.takeProfit, analysis.takeProfit2].filter(Boolean);
  if (!targets.length) return "";
  return pickOne(["TP ", "Targets "]) + targets.join(" → ");
}

/** Format A: Structured lines — pair, bias, level, targets. */
function formatStructured(schedule, analysis) {
  const pair = getPair(schedule, analysis);
  const lines = [pair, getBiasLine(analysis), getLevelLine(analysis), getTargetsLine(analysis)].filter(Boolean);
  return lines.join("\n");
}

/** Format B: One-liner — "Bullish on EUR/USD 1H. Key level 1.08. TP 1.09." */
function formatOneliner(schedule, analysis) {
  const pair = getPair(schedule, analysis);
  const parts = [
    `${getBiasWord(analysis)} on ${pair}`,
    getLevelShort(analysis),
    getTargetsShort(analysis),
  ].filter(Boolean);
  return parts.join(". ") + (parts.length ? "." : "");
}

/** Format C: Level-first — "Key level 1.08 — above = buyers. EUR/USD 1H. Targets 1.09." */
function formatLevelFirst(schedule, analysis) {
  const pair = getPair(schedule, analysis);
  const level = getLevelLine(analysis);
  const targets = getTargetsLine(analysis);
  if (level) {
    const rest = [pair, targets].filter(Boolean).join(". ");
    return `${level}. ${rest}`;
  }
  return [pair, targets].filter(Boolean).join("\n");
}

/** Format D: Minimal — "EUR/USD 1H — Bullish (80%). S/R and targets in chart." */
function formatMinimal(schedule, analysis) {
  const pair = getPair(schedule, analysis);
  const conf = analysis.confidence != null ? ` (${analysis.confidence}%)` : "";
  return `${pair} — ${getBiasWord(analysis)}${conf}. S/R and targets in chart.`;
}

const FORMATS = [formatStructured, formatOneliner, formatLevelFirst, formatMinimal];

/**
 * Generate a short, high-impact forex post for X (Twitter).
 * Random format (4 styles), random phrasings (40%+ lexical variation), random 3–5 hashtags from pool of 10.
 */
function formatCaption(schedule, analysis) {
  const formatIndex = Math.floor(Math.random() * FORMATS.length);
  const body = FORMATS[formatIndex](schedule, analysis);
  const hashtags = pickHashtags(HASHTAG_POOL, 3, 5);
  return body + (hashtags ? "\n\n" + hashtags : "");
}

module.exports = {
  analyzeImage,
  analyzeImageViaApp,
  analyzeImageOpenAI,
  formatCaption,
  pickHashtags,
  HASHTAG_POOL,
};
