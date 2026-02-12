export type MarketBias = "bullish" | "bearish" | "range";

export interface AnalysisResult {
  marketBias: MarketBias;
  support: string[];
  resistance: string[];
  entry: string;
  takeProfit: string;
  stopLoss: string;
  /** Optional second take profit level */
  takeProfit2?: string;
  /** Optional second stop loss level */
  stopLoss2?: string;
  riskReward: string;
  /** Confidence in the analysis, 0–100 */
  confidence?: number;
  reasoning: string;
  /** Trading pair/symbol when visible on chart e.g. "BTC/USD", "EURUSD" */
  symbol?: string;
  /** Timeframe from chart if visible e.g. "5m", "15m", "1H" */
  timeframe?: string;
}

export const MARKET_BIAS_LABELS: Record<MarketBias, string> = {
  bullish: "Bullish",
  bearish: "Bearish",
  range: "Range",
};

/** User preferences for analysis output (e.g. on /analyze page). */
export interface AnalysisOptions {
  /** Number of take profit levels to return (1 or 2). 2 is subscriber-only. */
  numTp: 1 | 2;
  /** Number of stop loss levels to return (1 or 2). 2 is subscriber-only. */
  numSl: 1 | 2;
  /** Include confidence score 0–100. */
  includeConfidence?: boolean;
  /** Include risk:reward ratio. */
  includeRiskReward?: boolean;
  /** Subscriber-only: longer, more detailed reasoning (4–6 sentences). */
  extendedReasoning?: boolean;
}

export const DEFAULT_ANALYSIS_OPTIONS: AnalysisOptions = {
  numTp: 1,
  numSl: 1,
  includeConfidence: true,
  includeRiskReward: true,
  extendedReasoning: false,
};
