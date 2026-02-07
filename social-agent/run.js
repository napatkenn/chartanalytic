#!/usr/bin/env node
/**
 * Run the chart capture → analyze → post pipeline for one or all due schedules.
 * Usage:
 *   node run.js              Run all schedules due at current UTC hour
 *   node run.js eurusd       Run only EUR/USD schedule
 *   node run.js --no-analyze Run without AI analysis (post chart only with symbol/tf caption)
 *   node run.js --dry-run    Capture + analyze + format post text; print only, do not post to X
 *
 * Loads .env from project root. Requires: puppeteer, OPENAI_API_KEY or Chart Analytic app (if analyzing), X API credentials (unless --dry-run).
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
const { analyzeImage, formatCaption, pickHashtags, HASHTAG_POOL } = require("./analyze");
const { composeExportImage } = require("./compose-export");
const postX = require("./post-x");

const OUT_DIR = path.join(__dirname, "output");

async function runOne(schedule, options = {}) {
  const { skipAnalyze = false, dryRun = false } = options;
  const outPath = path.join(OUT_DIR, `${schedule.id}-${Date.now()}.png`);

  console.log(`[${schedule.id}] Capturing ${schedule.name} ${schedule.timeframe}...`);
  await fs.mkdir(OUT_DIR, { recursive: true });
  await captureChart(schedule.url, outPath, { waitMs: 4000, schedule });

  let caption;
  let imagePathForPost = outPath;
  if (skipAnalyze) {
    const hashtags = pickHashtags(HASHTAG_POOL, 3, 5);
    caption = `${schedule.name} ${schedule.timeframe} chart\n${hashtags}`;
  } else {
    console.log(`[${schedule.id}] Analyzing...`);
    const analysis = await analyzeImage(outPath);
    caption = formatCaption(schedule, analysis);
    // Compose Chart Analytic–style export (chart + analysis panel) and use that for the post
    const exportPath = path.join(OUT_DIR, `${schedule.id}-${Date.now()}-export.png`);
    console.log(`[${schedule.id}] Composing export image (chart + analysis)...`);
    await composeExportImage(outPath, analysis, exportPath, {
      pairLabel: `${schedule.name} ${schedule.timeframe}`,
    });
    imagePathForPost = exportPath;
  }

  if (dryRun) {
    console.log(`[${schedule.id}] --- Post text (dry-run, not posted) ---`);
    console.log(caption);
    console.log(`[${schedule.id}] --- Image: ${imagePathForPost} ---`);
    return { dryRun: true, caption, imagePath: imagePathForPost };
  }

  if (!postX.isConfigured()) {
    throw new Error("X API not configured. Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET (from developer.x.com).");
  }
  console.log(`[${schedule.id}] Posting to X...`);
  const result = await postX.postChart(imagePathForPost, caption);
  console.log(`[${schedule.id}] Done.`, result);
  return result;
}

/** Sleep ms (for cron jitter). */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const skipAnalyze = args.includes("--no-analyze");
  const dryRun = args.includes("--dry-run");
  const filtered = args.filter((a) => !a.startsWith("--"));

  // Cron jitter: when run by cron (no schedule id), wait 1–10 min so runs aren't all at exact :00
  if (filtered.length === 0) {
    const jitterMin = 1 + Math.floor(Math.random() * 10);
    const jitterMs = jitterMin * 60 * 1000;
    console.log(`Cron jitter: waiting ${jitterMin} min before running...`);
    await sleep(jitterMs);
  }

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
      await runOne(schedule, { skipAnalyze, dryRun });
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
