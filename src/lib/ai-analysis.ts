import OpenAI from "openai";
import { z } from "zod";
import type { AnalysisResult, AnalysisOptions } from "./analysis-types";
import { DEFAULT_ANALYSIS_OPTIONS } from "./analysis-types";

const AnalysisSchema = z.object({
  marketBias: z.enum(["bullish", "bearish", "range"]),
  support: z.array(z.string()),
  resistance: z.array(z.string()),
  entry: z.string(),
  takeProfit: z.string(),
  stopLoss: z.string(),
  takeProfit2: z.string().optional(),
  stopLoss2: z.string().optional(),
  riskReward: z.string().optional(),
  confidence: z.number().min(0).max(100).optional(),
  reasoning: z.string(),
  symbol: z.string().optional(),
  timeframe: z.string().optional(),
  invalidationLevel: z.string().optional(),
  keyRisk: z.string().optional(),
});

const BASE_PROMPT = `You are an expert technical analyst. Analyze the provided trading chart screenshot.

IMPORTANT - Read from the chart image:
1. SYMBOL: Look at the chart title/header for the trading pair (e.g. "BTC/USD", "EURUSD", "Gold Spot / U.S. Dollar", "Silver / U.S. Dollar"). Include it in "symbol" exactly as shown, or omit only if not visible.
2. TIMEFRAME: If the timeframe is shown (e.g. 1m, 5m, 15m, 1H, 4H, 1D), include it in "timeframe". Assume 5–15m only if nothing is visible.

Return a structured analysis in the following JSON format only (no markdown, no code block).`;

function buildSystemPrompt(opts: AnalysisOptions): string {
  const numTp = opts.numTp ?? DEFAULT_ANALYSIS_OPTIONS.numTp;
  const numSl = opts.numSl ?? DEFAULT_ANALYSIS_OPTIONS.numSl;
  const includeConfidence = opts.includeConfidence ?? DEFAULT_ANALYSIS_OPTIONS.includeConfidence;
  const includeRiskReward = opts.includeRiskReward ?? DEFAULT_ANALYSIS_OPTIONS.includeRiskReward;
  const reasoningDepth = opts.reasoningDepth ?? DEFAULT_ANALYSIS_OPTIONS.reasoningDepth ?? "standard";
  const maxSr = opts.maxSupportResistance ?? DEFAULT_ANALYSIS_OPTIONS.maxSupportResistance ?? 2;
  const tradingStyle = opts.tradingStyle;
  const includeInvalidation = opts.includeInvalidation ?? DEFAULT_ANALYSIS_OPTIONS.includeInvalidation;
  const includeCaveat = opts.includeCaveat ?? DEFAULT_ANALYSIS_OPTIONS.includeCaveat;

  const supportResistanceDesc = `["level1", "level2"${maxSr >= 3 ? ', "level3"' : ""}${maxSr >= 4 ? ', "level4"' : ""}]`;
  const lines: string[] = [
    "  \"marketBias\": \"bullish\" | \"bearish\" | \"range\",",
    `  \"support\": ${supportResistanceDesc},`,
    `  \"resistance\": ${supportResistanceDesc},`,
    "  \"entry\": \"suggested entry price or zone\",",
    "  \"takeProfit\": \"primary TP level\",",
    "  \"stopLoss\": \"primary SL level\",",
  ];
  if (numTp === 2) lines.push("  \"takeProfit2\": \"optional second TP level (extended target)\",");
  if (numSl === 2) lines.push("  \"stopLoss2\": \"optional second SL level (wider stop if applicable)\",");
  if (includeRiskReward) lines.push("  \"riskReward\": \"e.g. 1:2 or 1:1.5\",");
  if (includeConfidence) lines.push("  \"confidence\": 0-100 integer (how confident the analysis is),");
  const reasoningDesc =
    reasoningDepth === "brief"
      ? "1-2 short sentences on bias and key level"
      : reasoningDepth === "detailed"
        ? "4-6 sentences: price structure, trend, key levels, momentum, and trade context"
        : "2-4 sentences on price action, trend, and momentum";
  lines.push(`  \"reasoning\": \"${reasoningDesc}\",`);
  lines.push("  \"symbol\": \"trading pair from chart if visible\",");
  lines.push(
    "  \"timeframe\": \"timeframe from chart if visible, e.g. 5m, 15m, 1H\"" +
      (includeInvalidation || includeCaveat ? "," : "")
  );
  if (includeInvalidation)
    lines.push(
      "  \"invalidationLevel\": \"price level that invalidates this setup (optional)\"" + (includeCaveat ? "," : "")
    );
  if (includeCaveat) lines.push("  \"keyRisk\": \"one short key risk or caveat (optional)\"");

  const formatBlock = "{\n" + lines.join("\n") + "\n}";
  const instructions: string[] = [
    "Focus on clarity and actionable levels. Use exact numbers from the chart when visible.",
    reasoningDepth === "brief"
      ? "Write very brief reasoning (1-2 sentences) on bias and the main level."
      : reasoningDepth === "detailed"
        ? "Write detailed reasoning (4-6 sentences) covering price structure, trend, key levels, momentum, and trade context."
        : "Keep reasoning concise and trader-focused (2-4 sentences).",
  ];
  if (tradingStyle) {
    instructions.push(
      `The user is trading for ${tradingStyle}. Tailor entry, TP, SL and reasoning to this style (e.g. tighter levels for scalping, broader for swing).`
    );
  }
  if (numTp === 1) instructions.push("Return ONLY one take profit level in \"takeProfit\". Do NOT include \"takeProfit2\".");
  if (numSl === 1) instructions.push("Return ONLY one stop loss level in \"stopLoss\". Do NOT include \"stopLoss2\".");
  if (maxSr === 2) instructions.push("Return exactly 2 support levels and 2 resistance levels.");
  if (includeInvalidation) instructions.push("Include invalidationLevel if a clear invalidation price exists.");
  if (includeCaveat) instructions.push("Include keyRisk as one short sentence (e.g. key level to watch or main risk).");

  return `${BASE_PROMPT}\n\n${formatBlock}\n\n${instructions.join(" ")}`;
}

const OPENAI_TIMEOUT_MS = 120_000; // 120s — balance completion rate vs Vercel 300s limit

export async function analyzeChartImage(
  imageBase64: string,
  options: AnalysisOptions = DEFAULT_ANALYSIS_OPTIONS
): Promise<AnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const opts = { ...DEFAULT_ANALYSIS_OPTIONS, ...options };
  const systemPrompt = buildSystemPrompt(opts);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  const openai = new OpenAI({ apiKey });
  try {
    const response = await openai.chat.completions.create(
      {
        model: "gpt-4o",
        max_tokens: 800,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
      },
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) throw new Error("Empty AI response");

    const parsed = JSON.parse(raw) as unknown;
    const validated = AnalysisSchema.parse(parsed);
    let result = validated as AnalysisResult;

    // Normalize: ensure optional fields match options
    if (!opts.includeRiskReward) result = { ...result, riskReward: result.riskReward ?? "—" };
    if (!opts.includeConfidence) result = { ...result, confidence: undefined };
    if (opts.numTp === 1) result = { ...result, takeProfit2: undefined };
    if (opts.numSl === 1) result = { ...result, stopLoss2: undefined };
    if (!opts.includeInvalidation) result = { ...result, invalidationLevel: undefined };
    if (!opts.includeCaveat) result = { ...result, keyRisk: undefined };
    // Cap support/resistance to requested max length
    const maxSr = opts.maxSupportResistance ?? 2;
    if (result.support.length > maxSr) result = { ...result, support: result.support.slice(0, maxSr) };
    if (result.resistance.length > maxSr) result = { ...result, resistance: result.resistance.slice(0, maxSr) };

    return result as AnalysisResult;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Analysis timed out. Try a smaller image or try again.");
    }
    throw err;
  }
}
