import OpenAI from "openai";
import { z } from "zod";
import type { AnalysisResult, MarketBias } from "./analysis-types";

const AnalysisSchema = z.object({
  marketBias: z.enum(["bullish", "bearish", "range"]),
  support: z.array(z.string()),
  resistance: z.array(z.string()),
  entry: z.string(),
  takeProfit: z.string(),
  stopLoss: z.string(),
  takeProfit2: z.string().optional(),
  stopLoss2: z.string().optional(),
  riskReward: z.string(),
  confidence: z.number().min(0).max(100).optional(),
  reasoning: z.string(),
  symbol: z.string().optional(),
  timeframe: z.string().optional(),
});

const SYSTEM_PROMPT = `You are an expert technical analyst. Analyze the provided trading chart screenshot.

IMPORTANT - Read from the chart image:
1. SYMBOL: Look at the chart title/header for the trading pair (e.g. "BTC/USD", "EURUSD", "Gold Spot / U.S. Dollar", "Silver / U.S. Dollar"). Include it in "symbol" exactly as shown, or omit only if not visible.
2. TIMEFRAME: If the timeframe is shown (e.g. 1m, 5m, 15m, 1H, 4H, 1D), include it in "timeframe". Assume 5–15m only if nothing is visible.

Return a structured analysis in the following JSON format only (no markdown, no code block):
{
  "marketBias": "bullish" | "bearish" | "range",
  "support": ["level1", "level2"],
  "resistance": ["level1", "level2"],
  "entry": "suggested entry price or zone",
  "takeProfit": "primary TP level",
  "stopLoss": "primary SL level",
  "takeProfit2": "optional second TP level (extended target)",
  "stopLoss2": "optional second SL level (wider stop if applicable)",
  "riskReward": "e.g. 1:2 or 1:1.5",
  "confidence": 0-100 integer indicating how confident the analysis is based on chart clarity and confluence,
  "reasoning": "2-4 sentences on price action, trend, and momentum",
  "symbol": "trading pair from chart title/header if visible, e.g. BTC/USD, Gold Spot / U.S. Dollar",
  "timeframe": "timeframe from chart if visible, e.g. 5m, 15m, 1H"
}

Focus on clarity and actionable levels. Use exact numbers from the chart when visible. Keep reasoning concise and trader-focused.`;

const OPENAI_TIMEOUT_MS = 90_000; // 90s — avoid Vercel 300s function timeout

export async function analyzeChartImage(imageBase64: string): Promise<AnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  const openai = new OpenAI({ apiKey });
  try {
    const response = await openai.chat.completions.create(
      {
        model: "gpt-4o",
        max_tokens: 800,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
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
    return validated as AnalysisResult;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Analysis timed out. Try a smaller image or try again.");
    }
    throw err;
  }
}
