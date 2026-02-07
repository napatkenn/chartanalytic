/**
 * Run chart analysis on an image file.
 * Prefers Chart Analytic app API (upload image, get analysis) when CHART_ANALYTIC_URL + ANALYZE_IMAGE_SECRET are set.
 * Otherwise uses OpenAI directly (OPENAI_API_KEY).
 */

const fs = require("fs").promises;
const path = require("path");

/** Analyze via Chart Analytic app: POST image to /api/analyze-image, same pipeline as photo upload. */
async function analyzeImageViaApp(imagePath) {
  const baseUrl = (process.env.CHART_ANALYTIC_URL || "http://localhost:3000").replace(/\/$/, "");
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

function formatCaption(schedule, analysis) {
  const bias = (analysis.marketBias || "").toUpperCase();
  const confidence = analysis.confidence != null ? ` (${analysis.confidence}%)` : "";
  const lines = [
    `${schedule.name} ${schedule.timeframe} • Bias: ${bias}${confidence}`,
    analysis.entry ? `Entry: ${analysis.entry}` : null,
    analysis.takeProfit ? `TP: ${analysis.takeProfit}` : null,
    analysis.takeProfit2 ? `TP2: ${analysis.takeProfit2}` : null,
    analysis.stopLoss ? `SL: ${analysis.stopLoss}` : null,
    analysis.stopLoss2 ? `SL2: ${analysis.stopLoss2}` : null,
    analysis.reasoning ? `\n${analysis.reasoning}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

module.exports = { analyzeImage, analyzeImageViaApp, analyzeImageOpenAI, formatCaption };
