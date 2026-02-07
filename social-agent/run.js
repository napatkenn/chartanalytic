#!/usr/bin/env node
/**
 * Run the chart capture → analyze → post pipeline for one or all due schedules.
 * Usage:
 *   node run.js              Run all schedules due at current UTC hour
 *   node run.js eurusd       Run only EUR/USD schedule
 *   node run.js --no-analyze Run without AI analysis (post chart only with symbol/tf caption)
 *
 * Loads .env from project root. Requires: puppeteer, OPENAI_API_KEY (if analyzing), Postiz env vars.
 */

const path = require("path");
const fs = require("fs").promises;

// Load .env from project root (sync)
const rootEnv = path.resolve(__dirname, "..", ".env");
try {
  const content = require("fs").readFileSync(rootEnv, "utf8");
  content.split("\n").forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  });
} catch {
  // .env optional
}

const { getSchedulesForHour, getScheduleById, SCHEDULES } = require("./config");
const { captureChart } = require("./capture");
const { analyzeImage, formatCaption } = require("./analyze");
const { postChart } = require("./postiz");

const OUT_DIR = path.join(__dirname, "output");

async function runOne(schedule, options = {}) {
  const { skipAnalyze = false } = options;
  const outPath = path.join(OUT_DIR, `${schedule.id}-${Date.now()}.png`);

  console.log(`[${schedule.id}] Capturing ${schedule.name} ${schedule.timeframe}...`);
  await fs.mkdir(OUT_DIR, { recursive: true });
  await captureChart(schedule.url, outPath, { waitMs: 4000, schedule });

  let caption;
  if (skipAnalyze) {
    caption = `${schedule.name} ${schedule.timeframe} chart\n#trading #forex #chart`;
  } else {
    console.log(`[${schedule.id}] Analyzing...`);
    const analysis = await analyzeImage(outPath);
    caption = formatCaption(schedule, analysis);
  }

  console.log(`[${schedule.id}] Posting to Postiz...`);
  const result = await postChart(outPath, caption);
  console.log(`[${schedule.id}] Done.`, result);
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const skipAnalyze = args.includes("--no-analyze");
  const filtered = args.filter((a) => !a.startsWith("--"));

  let schedules;
  if (filtered.length) {
    const id = filtered[0].toLowerCase();
    const s = getScheduleById(id);
    if (!s) {
      console.error("Unknown schedule:", id);
      console.error("Available:", SCHEDULES.map((x) => x.id).join(", "));
      process.exit(1);
    }
    schedules = [s];
  } else {
    const utcHour = new Date().getUTCHours();
    schedules = getSchedulesForHour(utcHour);
    if (!schedules.length) {
      console.log(`No schedules for current UTC hour (${utcHour}:00). Next: ${SCHEDULES.map((s) => `${s.id}@${s.postTimeUTC}:00`).join(", ")}`);
      process.exit(0);
    }
  }

  for (const schedule of schedules) {
    try {
      await runOne(schedule, { skipAnalyze });
    } catch (err) {
      console.error(`[${schedule.id}] Error:`, err.message);
      process.exitCode = 1;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
