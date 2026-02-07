#!/usr/bin/env node
/**
 * Test TradingView chart capture only (no analyze, no post to X).
 * Usage: node social-agent/test-capture.js [eurusd|gbpusd|xauusd|usdjpy|audusd]
 * Default: eurusd. Output: social-agent/output/
 */

const path = require("path");
const fs = require("fs").promises;

const rootEnv = path.resolve(__dirname, "..", ".env");
try {
  const content = require("fs").readFileSync(rootEnv, "utf8");
  content.split("\n").forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  });
} catch {}

const { getScheduleById, SCHEDULES } = require("./config");
const { captureChart } = require("./capture");

const OUT_DIR = path.join(__dirname, "output");

async function main() {
  const id = (process.argv[2] || "eurusd").toLowerCase();
  const schedule = getScheduleById(id);
  if (!schedule) {
    console.error("Unknown schedule:", id);
    console.error("Available:", SCHEDULES.map((s) => s.id).join(", "));
    process.exit(1);
  }

  const outPath = path.join(OUT_DIR, `test-${schedule.id}-${Date.now()}.png`);
  console.log("Capturing", schedule.name, schedule.timeframe, "->", schedule.url);
  await fs.mkdir(OUT_DIR, { recursive: true });

  const result = await captureChart(schedule.url, outPath, { waitMs: 4000, schedule });
  console.log("Saved:", result.path, "size:", result.size, "bytes");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
