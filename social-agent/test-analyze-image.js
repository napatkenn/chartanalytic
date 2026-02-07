#!/usr/bin/env node
/**
 * Test what we get from the app's analyze API when sending a chart image.
 * 1. Uses a captured TradingView image (or path as first arg).
 * 2. POSTs to CHART_ANALYTIC_URL/api/analyze-image (same pipeline as app UI analysis).
 * 3. Prints the analysis JSON and a short summary.
 *
 * Requires: app running (e.g. npm run dev), ANALYZE_IMAGE_SECRET in app .env,
 *           CHART_ANALYTIC_URL and ANALYZE_IMAGE_SECRET in this env.
 * If no image: run node social-agent/test-capture.js eurusd first.
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

async function findTestImage() {
  const arg = process.argv[2];
  if (arg) {
    const p = path.isAbsolute(arg) ? arg : path.resolve(process.cwd(), arg);
    try {
      await fs.stat(p);
      return p;
    } catch {
      console.error("File not found:", p);
      process.exit(1);
    }
  }
  try {
    const names = await fs.readdir(OUT_DIR);
    const pngs = names.filter((n) => n.endsWith(".png")).sort();
    if (pngs.length === 0) {
      console.error("No PNG in social-agent/output. Run: node social-agent/test-capture.js eurusd");
      process.exit(1);
    }
    return path.join(OUT_DIR, pngs[pngs.length - 1]);
  } catch (e) {
    console.error("No output dir or no images. Run: node social-agent/test-capture.js eurusd");
    process.exit(1);
  }
}

function printAnalysis(analysis, source) {
  console.log("Source:", source, "\n");
  console.log("--- Analysis (same shape as app UI) ---");
  console.log(JSON.stringify(analysis, null, 2));
  console.log("\n--- Summary ---");
  console.log("Bias:", analysis.marketBias);
  console.log("Confidence:", analysis.confidence != null ? analysis.confidence + "%" : "—");
  console.log("Entry:", analysis.entry || "—");
  console.log("TP:", analysis.takeProfit || "—");
  console.log("TP2:", analysis.takeProfit2 || "—");
  console.log("SL:", analysis.stopLoss || "—");
  console.log("SL2:", analysis.stopLoss2 || "—");
  console.log("R:R:", analysis.riskReward || "—");
  console.log("Reasoning:", (analysis.reasoning || "").slice(0, 120) + (analysis.reasoning && analysis.reasoning.length > 120 ? "…" : ""));
}

async function main() {
  const imagePath = await findTestImage();
  const stat = await fs.stat(imagePath);
  console.log("Image:", imagePath, "size:", stat.size, "bytes\n");

  const baseUrl = process.env.CHART_ANALYTIC_URL;
  const secret = process.env.ANALYZE_IMAGE_SECRET;

  if (baseUrl && secret) {
    const buffer = await fs.readFile(imagePath);
    const formData = new FormData();
    formData.append("chart", new Blob([buffer], { type: "image/png" }), path.basename(imagePath));
    const url = `${baseUrl.replace(/\/$/, "")}/api/analyze-image`;
    console.log("POST", url, "(app analyze-image API)...\n");

    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      body: formData,
    });

    const text = await res.text();
    if (!res.ok) {
      console.error("Error", res.status, text);
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
      console.error("Response missing analysis:", data);
      process.exit(1);
    }
    printAnalysis(data.analysis, "Chart Analytic app /api/analyze-image");
    return;
  }

  console.log("CHART_ANALYTIC_URL or ANALYZE_IMAGE_SECRET not set — using agent OpenAI analysis (same schema as app).");
  console.log("(Set both in .env to test against the app’s analyze-image endpoint.)\n");

  const { analyzeImageOpenAI } = require("./analyze");
  const analysis = await analyzeImageOpenAI(imagePath);
  printAnalysis(analysis, "Agent OpenAI (analyzeImageOpenAI)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
