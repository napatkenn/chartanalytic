#!/usr/bin/env node
/**
 * Test the full flow: TradingView capture → image file → send to Chart Analytic app.
 * 1. Capture chart from TradingView (or use latest image in output/).
 * 2. POST that image to CHART_ANALYTIC_URL/api/analyze-image.
 * 3. Log how the image was downloaded (saved) and how the app received it (response).
 *
 * Usage:
 *   node social-agent/test-tradingview-to-app.js          Use latest image in output/
 *   node social-agent/test-tradingview-to-app.js eurusd   Capture EUR/USD then send to app
 *   node social-agent/test-tradingview-to-app.js --capture-only  Only capture, don't call app
 *
 * Requires: CHART_ANALYTIC_URL, ANALYZE_IMAGE_SECRET in .env; app running (npm run dev).
 * For capture step: run from project root so .env and node_modules are available.
 */

const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");

const rootEnv = path.resolve(__dirname, "..", ".env");
try {
  const content = require("fs").readFileSync(rootEnv, "utf8");
  content.split("\n").forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  });
} catch {}

const OUT_DIR = path.join(__dirname, "output");

async function findLatestImage() {
  const names = await fs.readdir(OUT_DIR);
  const pngs = names.filter((n) => n.endsWith(".png")).sort();
  if (pngs.length === 0) return null;
  return path.join(OUT_DIR, pngs[pngs.length - 1]);
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const captureOnly = process.argv.includes("--capture-only");
  const scheduleId = args[0] ? args[0].toLowerCase() : null;

  let imagePath;
  let imageSize;

  if (scheduleId) {
    const { getScheduleById, SCHEDULES } = require("./config");
    const schedule = getScheduleById(scheduleId);
    if (!schedule) {
      console.error("Unknown schedule:", scheduleId, "Available:", SCHEDULES.map((s) => s.id).join(", "));
      process.exit(1);
    }
    const { captureChart } = require("./capture");
    imagePath = path.join(OUT_DIR, `test-flow-${schedule.id}-${Date.now()}.png`);
    await fs.mkdir(OUT_DIR, { recursive: true });

    console.log("=== Step 1: Capture from TradingView ===");
    console.log("URL:", schedule.url);
    console.log("Saving to:", imagePath);
    await captureChart(schedule.url, imagePath, { waitMs: 4000, schedule });
    const stat = await fs.stat(imagePath);
    imageSize = stat.size;
    console.log("Downloaded (saved) image:", imagePath, "size:", imageSize, "bytes\n");
  } else {
    imagePath = await findLatestImage();
    if (!imagePath) {
      console.error("No image in social-agent/output. Run: node social-agent/test-tradingview-to-app.js eurusd");
      process.exit(1);
    }
    const stat = await fs.stat(imagePath);
    imageSize = stat.size;
    console.log("=== Using existing image ===");
    console.log("Path:", imagePath);
    console.log("Size:", imageSize, "bytes\n");
  }

  if (captureOnly) {
    console.log("--capture-only: skipping app request.");
    return;
  }

  const baseUrl = process.env.CHART_ANALYTIC_URL;
  const secret = process.env.ANALYZE_IMAGE_SECRET;

  if (!baseUrl || !secret) {
    console.log("=== Step 2: Send image to Chart Analytic app ===");
    console.log("Skipped: set CHART_ANALYTIC_URL and ANALYZE_IMAGE_SECRET in .env to test upload to app.");
    console.log("Image is ready at:", imagePath);
    return;
  }

  console.log("=== Step 2: Send image to Chart Analytic app ===");
  console.log("POST", `${baseUrl.replace(/\/$/, "")}/api/analyze-image`);
  console.log("Body: multipart/form-data, field 'chart', file:", path.basename(imagePath), "(" + imageSize, "bytes)");

  const buffer = await fs.readFile(imagePath);
  const formData = new FormData();
  formData.append("chart", new Blob([buffer], { type: "image/png" }), path.basename(imagePath));

  const url = `${baseUrl.replace(/\/$/, "")}/api/analyze-image`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    body: formData,
  });

  const text = await res.text();
  console.log("Response status:", res.status, res.statusText);

  if (!res.ok) {
    console.error("Response body:", text);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("Invalid JSON:", text);
    process.exit(1);
  }

  if (!data.analysis) {
    console.error("Missing analysis in response:", data);
    process.exit(1);
  }

  console.log("Image was received and analyzed by the app.\n");
  console.log("=== Step 3: Analysis result (from app) ===");
  console.log("Bias:", data.analysis.marketBias);
  console.log("Confidence:", data.analysis.confidence != null ? data.analysis.confidence + "%" : "—");
  console.log("Entry:", data.analysis.entry || "—");
  console.log("TP:", data.analysis.takeProfit || "—");
  console.log("TP2:", data.analysis.takeProfit2 || "—");
  console.log("SL:", data.analysis.stopLoss || "—");
  console.log("SL2:", data.analysis.stopLoss2 || "—");
  console.log("R:R:", data.analysis.riskReward || "—");
  console.log("Reasoning:", (data.analysis.reasoning || "").slice(0, 100) + "...");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
