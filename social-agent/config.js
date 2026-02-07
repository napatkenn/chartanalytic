/**
 * Chart posting schedule (times in UTC).
 * TradingView chart URL uses: symbol (e.g. FX:EURUSD, OANDA:XAUUSD) and interval in minutes.
 * Each entry runs at the given hour; use system cron or Task Scheduler to invoke run.js.
 * @see https://github.com/gitroomhq/postiz-app
 */

const INTERVAL = {
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
];

function getSchedulesForHour(utcHour) {
  return SCHEDULES.filter((s) => s.postTimeUTC === utcHour);
}

function getScheduleById(id) {
  return SCHEDULES.find((s) => s.id === id);
}

module.exports = {
  SCHEDULES,
  getSchedulesForHour,
  getScheduleById,
};
