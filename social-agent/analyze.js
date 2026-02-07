/**
 * Run chart analysis on an image file.
 * Prefers Chart Analytic app API (upload image, get analysis) when CHART_ANALYTIC_URL + ANALYZE_IMAGE_SECRET are set.
 * Otherwise uses OpenAI directly (OPENAI_API_KEY).
 */

const fs = require("fs").promises;
const path = require("path");

function normalizeAppUrl(url) {
  if (!url || !url.trim()) return "http://localhost:3000";
  const u = url.trim().replace(/\/$/, "");
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `https://${u}`;
}

/** Analyze via Chart Analytic app: POST image to /api/analyze-image, same pipeline as photo upload. */
async function analyzeImageViaApp(imagePath) {
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
    let err;
    try {
      err = JSON.parse(text).error || text;
    } catch {
      err = text;
    }
    throw new Error(`Chart Analytic API: ${res.status} ${err}`);
  }

  const data = await res.json();
  if (!data.analysis) throw new Error("Chart Analytic API: missing analysis in response");
  return data.analysis;
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
  "confidence": 0-100 integer,
  "reasoning": "2-4 sentences on price action, trend, and momentum",
  "symbol": "trading pair if visible",
  "timeframe": "timeframe if visible"
}

Focus on clarity and actionable levels. Use exact numbers from the chart when visible.`;

/** Analyze via OpenAI directly (same logic as main app). */
async function analyzeImageOpenAI(imagePath) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const buffer = await fs.readFile(imagePath);
  const base64 = buffer.toString("base64");
  const dataUrl = `data:image/png;base64,${base64}`;

  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey });
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 800,
    messages: [
      { role: "system", content: ANALYSIS_PROMPT },
      {
        role: "user",
        content: [{ type: "image_url", image_url: { url: dataUrl } }],
      },
    ],
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error("Empty AI response");
  const parsed = JSON.parse(raw);
  return parsed;
}

/**
 * Analyze image: use Chart Analytic app API if configured, else OpenAI direct.
 */
async function analyzeImage(imagePath) {
  const baseUrl = process.env.CHART_ANALYTIC_URL;
  const secret = process.env.ANALYZE_IMAGE_SECRET;
  if (baseUrl && secret) {
    return analyzeImageViaApp(imagePath);
  }
  return analyzeImageOpenAI(imagePath);
}

/** 3–5 forex hashtags for X */
const FOREX_HASHTAGS = ["#forex", "#trading", "#fx", "#technicalanalysis", "#forexsignals"];

/**
 * Generate a short, high-impact forex post for X (Twitter).
 * Format: symbol | timeframe, bias (%), one key level line, targets, hashtags.
 */
function formatCaption(schedule, analysis) {
  const symbol = (schedule.name || analysis.symbol || "FX").replace(/\s*\/\s*/g, "/").trim();
  const tf = (schedule.timeframe || analysis.timeframe || "").toUpperCase();
  const pair = `${symbol} | ${tf}`;

  const biasLabel = (analysis.marketBias || "range").charAt(0).toUpperCase() + (analysis.marketBias || "").slice(1);
  const confidence = analysis.confidence != null ? ` (${analysis.confidence}%)` : "";
  const biasLine = `Bias: ${biasLabel}${confidence}`;

  let levelLine = "";
  const res = analysis.resistance && analysis.resistance[0];
  const sup = analysis.support && analysis.support[0];
  if (analysis.marketBias === "bearish" && res) {
    levelLine = `Below ${res} = sellers in control`;
  } else if (analysis.marketBias === "bullish" && sup) {
    levelLine = `Above ${sup} = buyers in control`;
  } else if (analysis.marketBias === "range" && sup && res) {
    levelLine = `Between ${sup}–${res} = range`;
  } else if (res) {
    levelLine = `Key level: ${res}`;
  } else if (sup) {
    levelLine = `Key level: ${sup}`;
  }

  const targets = [analysis.takeProfit, analysis.takeProfit2].filter(Boolean);
  const targetsLine = targets.length ? `Targets: ${targets.join(" → ")}` : "";

  const lines = [pair, biasLine, levelLine, targetsLine].filter(Boolean);
  const body = lines.join("\n");
  const hashtags = FOREX_HASHTAGS.slice(0, 5).join(" ");
  return body + (hashtags ? "\n\n" + hashtags : "");
}

module.exports = { analyzeImage, analyzeImageViaApp, analyzeImageOpenAI, formatCaption };
