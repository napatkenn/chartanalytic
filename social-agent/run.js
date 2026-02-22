#!/usr/bin/env node
/**
 * Run the chart capture → analyze → post pipeline for one or all due schedules.
 * Usage:
 *   node run.js              Run all schedules due at current UTC hour
 *   node run.js eurusd       Run only EUR/USD schedule
 *   node run.js --no-analyze Run without AI analysis (post chart only with symbol/tf caption)
 *   node run.js --dry-run    Capture + analyze + format post text; print only, do not post to X
 *   node run.js --predict    Polymarket-only: capture, 15-min up/down analysis, place prediction; no X post
 *
 * Loads .env from project root. Requires: puppeteer, OPENAI_API_KEY or Chart Analytic app (if analyzing), X API credentials (unless --dry-run).
 */

const path = require("path");
const fs = require("fs").promises;

// Point Puppeteer at project .cache before any module loads Puppeteer (fixes ephemeral runners e.g. GitHub Actions where cwd may not set PUPPETEER_CACHE_DIR)
const projectRoot = path.resolve(__dirname, "..");
const puppeteerCache = path.join(projectRoot, ".cache", "puppeteer");
if (!process.env.PUPPETEER_CACHE_DIR) process.env.PUPPETEER_CACHE_DIR = puppeteerCache;

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

// Bootstrap global-agent so http/https can be proxied when env is set (polymarket.js sets it only during CLOB calls).
require("global-agent/bootstrap");

const { getSchedulesForHour, getSchedulesForPolymarket, getScheduleById, SCHEDULES } = require("./config");
const { captureChart } = require("./capture");
const { analyzeImage, formatCaption, pickHashtags, HASHTAG_POOL } = require("./analyze");
const { composeExportImage } = require("./compose-export");
const postX = require("./post-x");
const polymarket = require("./polymarket");

const OUT_DIR = path.join(__dirname, "output");

async function runOne(schedule, options = {}) {
  const { skipAnalyze = false, dryRun = false, doPredict = false } = options;
  const outPath = path.join(OUT_DIR, `${schedule.id}-${Date.now()}.png`);

  console.log(`[${schedule.id}] Capturing ${schedule.name} ${schedule.timeframe}...`);
  await fs.mkdir(OUT_DIR, { recursive: true });
  await captureChart(schedule.url, outPath, { waitMs: 4000, schedule });

  let caption;
  let imagePathForPost = outPath;
  let analysis = null;
  if (skipAnalyze) {
    const hashtags = pickHashtags(HASHTAG_POOL, 3, 5);
    caption = `${schedule.name} ${schedule.timeframe} chart\n${hashtags}`;
  } else {
    const forPolymarket15m = Boolean(doPredict && schedule.polymarketAsset);
    console.log(`[${schedule.id}] Analyzing${forPolymarket15m ? " (next 15 min up/down)..." : "..."}`);
    analysis = await analyzeImage(outPath, { forPolymarket15m });
    caption = formatCaption(schedule, analysis);
    if (!doPredict) {
      const exportPath = path.join(OUT_DIR, `${schedule.id}-${Date.now()}-export.png`);
      console.log(`[${schedule.id}] Composing export image (chart + analysis)...`);
      await composeExportImage(outPath, analysis, exportPath, {
        pairLabel: `${schedule.name} ${schedule.timeframe}`,
      });
      imagePathForPost = exportPath;
    }
  }

  if (doPredict && schedule.polymarketAsset && analysis) {
    if (!polymarket.isConfigured()) {
      console.warn(`[${schedule.id}] Polymarket not configured. Set POLYMARKET_PRIVATE_KEY in GitHub Actions secrets or in .env.`);
    } else {
      console.log(`[${schedule.id}] Placing Polymarket prediction...`);
      try {
        const result = await polymarket.placePrediction(schedule, analysis, { dryRun });
        console.log(`[${schedule.id}] Polymarket:`, result.message);
        if (result.placed) console.log(`[${schedule.id}] Order ID:`, result.orderId);
      } catch (err) {
        console.error(`[${schedule.id}] Polymarket error:`, err.message);
      }
    }
  }

  if (dryRun) {
    console.log(`[${schedule.id}] --- Post text (dry-run, not posted) ---`);
    console.log(caption);
    console.log(`[${schedule.id}] --- Image: ${imagePathForPost} ---`);
    return { dryRun: true, caption, imagePath: imagePathForPost };
  }

  if (doPredict) {
    console.log(`[${schedule.id}] Done (Polymarket bot; no social post).`);
    return { polymarketOnly: true };
  }

  if (!postX.isConfigured()) {
    throw new Error("X API not configured. Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET (from developer.x.com).");
  }
  console.log(`[${schedule.id}] Posting to X...`);
  const result = await postX.postChart(imagePathForPost, caption);
  console.log(`[${schedule.id}] Done.`, result);
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const skipAnalyze = args.includes("--no-analyze");
  const dryRun = args.includes("--dry-run");
  const doPredict = args.includes("--predict");
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
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();
    if (doPredict) {
      schedules = getSchedulesForPolymarket();
      if (schedules.length) {
        console.log("Polymarket mode: running", schedules.map((s) => s.id).join(", "));
        if (!polymarket.isConfigured()) {
          console.warn("POLYMARKET_PRIVATE_KEY not set. Set it in GitHub Actions secrets or in .env.");
        }
      }
    } else {
      schedules = getSchedulesForHour(utcHour);
      if (schedules.length) {
        console.log("Social mode: running", schedules.map((s) => s.id).join(", "));
      }
    }
    if (!schedules || !schedules.length) {
      console.log("No schedules due.");
      process.exit(0);
    }
  }

  for (const schedule of schedules) {
    try {
      await runOne(schedule, { skipAnalyze, dryRun, doPredict });
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
