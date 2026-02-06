export type MarketBias = "bullish" | "bearish" | "range";

export interface AnalysisResult {
  marketBias: MarketBias;
  support: string[];
  resistance: string[];
  entry: string;
  takeProfit: string;
  stopLoss: string;
  riskReward: string;
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
