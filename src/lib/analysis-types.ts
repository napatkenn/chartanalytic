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
