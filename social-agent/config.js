/**
 * Chart posting schedule (times in UTC).
 * TradingView chart URL uses: symbol (e.g. FX:EURUSD, OANDA:XAUUSD) and interval in minutes.
 * Each entry runs at the given hour; use system cron or Task Scheduler to invoke run.js.
 */

const INTERVAL = {
  M1: 1,
  M15: 15,
  H1: 60,
  H4: 240,
};

/** Build TradingView chart URL with symbol and interval (minutes). Chart loads with this timeframe. */
function chartUrl(symbol, intervalMinutes) {
  const base = "https://www.tradingview.com/chart/";
  const params = new URLSearchParams({
    symbol: symbol,
    interval: String(intervalMinutes),
  });
  return `${base}?${params.toString()}`;
}

/** Schedules: postTimeUTC is hour (0–23) in UTC */
const SCHEDULES = [
  {
    id: "eurusd",
    name: "EUR/USD",
    symbol: "FX:EURUSD",
    timeframe: "1H",
    interval: INTERVAL.H1,
    postTimeUTC: 7,
    url: chartUrl("FX:EURUSD", INTERVAL.H1),
  },
  {
    id: "gbpusd",
    name: "GBP/USD",
    symbol: "FX:GBPUSD",
    timeframe: "15M",
    interval: INTERVAL.M15,
    postTimeUTC: 12,
    url: chartUrl("FX:GBPUSD", INTERVAL.M15),
  },
  {
    id: "xauusd",
    name: "XAU/USD",
    symbol: "OANDA:XAUUSD",
    timeframe: "15M",
    interval: INTERVAL.M15,
    postTimeUTC: 15,
    url: chartUrl("OANDA:XAUUSD", INTERVAL.M15),
  },
  {
    id: "usdjpy",
    name: "USD/JPY",
    symbol: "FX:USDJPY",
    timeframe: "1H",
    interval: INTERVAL.H1,
    postTimeUTC: 17,
    url: chartUrl("FX:USDJPY", INTERVAL.H1),
  },
  {
    id: "audusd",
    name: "AUD/USD",
    symbol: "OANDA:AUDUSD",
    timeframe: "4H",
    interval: INTERVAL.H4,
    postTimeUTC: 20,
    url: chartUrl("OANDA:AUDUSD", INTERVAL.H4),
  },
  // Crypto 1-min for Polymarket prediction bot (run every 15 min: :00, :15, :30, :45)
  {
    id: "btc",
    name: "BTC/USDT",
    symbol: "BINANCE:BTCUSDT",
    timeframe: "1M",
    interval: INTERVAL.M1,
    postTimeUTC: 8,
    url: chartUrl("BINANCE:BTCUSDT", INTERVAL.M1),
    polymarketAsset: "btc",
    every15Min: true,
  },
  {
    id: "eth",
    name: "ETH/USDT",
    symbol: "BINANCE:ETHUSDT",
    timeframe: "1M",
    interval: INTERVAL.M1,
    postTimeUTC: 9,
    url: chartUrl("BINANCE:ETHUSDT", INTERVAL.M1),
    polymarketAsset: "eth",
    every15Min: true,
  },
  {
    id: "sol",
    name: "SOL/USDT",
    symbol: "BINANCE:SOLUSDT",
    timeframe: "1M",
    interval: INTERVAL.M1,
    postTimeUTC: 10,
    url: chartUrl("BINANCE:SOLUSDT", INTERVAL.M1),
    polymarketAsset: "sol",
    every15Min: true,
  },
  {
    id: "xrp",
    name: "XRP/USDT",
    symbol: "BINANCE:XRPUSDT",
    timeframe: "1M",
    interval: INTERVAL.M1,
    postTimeUTC: 11,
    url: chartUrl("BINANCE:XRPUSDT", INTERVAL.M1),
    polymarketAsset: "xrp",
    every15Min: true,
  },
];

/** Schedules due at this UTC hour (forex/gold etc.). */
function getSchedulesForHour(utcHour) {
  return SCHEDULES.filter((s) => !s.every15Min && s.postTimeUTC === utcHour);
}

/** Schedules that run every 15 min (crypto / Polymarket). Due when minute is 0, 15, 30, or 45. */
function getSchedulesFor15MinSlot(utcHour, utcMinute) {
  const slotMinutes = [0, 15, 30, 45];
  if (!slotMinutes.includes(utcMinute)) return [];
  return SCHEDULES.filter((s) => s.every15Min === true);
}

/** All schedules due right now: hourly (by hour) + every-15-min (by slot). No duplicates. */
function getSchedulesDueNow(utcHour, utcMinute) {
  const byHour = getSchedulesForHour(utcHour);
  const bySlot = getSchedulesFor15MinSlot(utcHour, utcMinute);
  const seen = new Set(byHour.map((s) => s.id));
  const merged = [...byHour];
  for (const s of bySlot) {
    if (!seen.has(s.id)) {
      seen.add(s.id);
      merged.push(s);
    }
  }
  return merged;
}

/** Only crypto schedules that place Polymarket predictions (btc, eth, sol, xrp). Use when running with --predict so every cron run hits Polymarket even if the minute is off. */
function getSchedulesForPolymarket() {
  return SCHEDULES.filter((s) => s.polymarketAsset && s.every15Min);
}

function getScheduleById(id) {
  return SCHEDULES.find((s) => s.id === id);
}

module.exports = {
  SCHEDULES,
  getSchedulesForHour,
  getSchedulesFor15MinSlot,
  getSchedulesDueNow,
  getSchedulesForPolymarket,
  getScheduleById,
};
