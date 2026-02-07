/**
 * Compose the "Chart Analytic" export image: chart + analysis panel (same idea as Download as image on the app).
 * Uses Puppeteer to render HTML to PNG so the posted image matches the app's style.
 */

const path = require("path");
const fs = require("fs").promises;
const puppeteer = require("puppeteer");

const EXPORT_WIDTH = 800;

/**
 * Build inline HTML for chart + analysis card (mirrors AnalysisDetailContent layout).
 */
function buildExportHtml(chartDataUrl, analysis, pairLabel) {
  const bias = (analysis.marketBias || "range").toLowerCase();
  const biasLabel =
    bias === "bullish"
      ? "Bullish"
      : bias === "bearish"
        ? "Bearish"
        : "Range";
  const badgeColor =
    bias === "bullish"
      ? "#059669"
      : bias === "bearish"
        ? "#b91c1c"
        : "#b45309";
  const confidence =
    analysis.confidence != null ? `${analysis.confidence}%` : "";

  const support = (analysis.support || []).filter(Boolean);
  const resistance = (analysis.resistance || []).filter(Boolean);
  const entry = analysis.entry ?? "—";
  const tp = analysis.takeProfit ?? "—";
  const tp2 = analysis.takeProfit2 ?? "—";
  const sl = analysis.stopLoss ?? "—";
  const sl2 = analysis.stopLoss2 ?? "—";
  const rr = analysis.riskReward ?? "—";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #f3f4f6; padding: 16px; }
    .card { width: ${EXPORT_WIDTH}px; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.08); overflow: hidden; border: 1px solid #e5e7eb; }
    .header { display: flex; align-items: center; gap: 12px; padding: 14px 20px; background: #f9fafb; border-bottom: 1px solid #f3f4f6; flex-wrap: wrap; }
    .badge { color: #fff; padding: 6px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; background: ${badgeColor}; }
    .confidence { font-size: 12px; color: #374151; font-weight: 500; }
    .chart-wrap { background: #f9fafb; border-bottom: 1px solid #e5e7eb; padding: 0; }
    .chart-wrap img { width: 100%; height: auto; display: block; vertical-align: top; }
    .section { padding: 16px 20px; border-bottom: 1px solid #f3f4f6; }
    .section:last-child { border-bottom: none; }
    .label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; margin-bottom: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    .value { font-family: ui-monospace, monospace; font-size: 13px; color: #111; }
    .value.green { color: #047857; font-weight: 600; }
    .value.red { color: #b91c1c; font-weight: 600; }
    .levels ul { margin: 0; padding-left: 18px; font-size: 13px; color: #111; }
    .pair { font-size: 12px; color: #6b7280; margin-left: auto; }
  </style>
</head>
<body>
  <div class="card" id="capture">
    <div class="header">
      <span class="badge">${biasLabel}${confidence ? ` (${confidence})` : ""}</span>
      ${pairLabel ? `<span class="pair">${pairLabel}</span>` : ""}
    </div>
    <div class="chart-wrap">
      <img src="${chartDataUrl}" alt="Chart" />
    </div>
    <div class="section">
      <div class="label">Support / Resistance / R:R</div>
      <div class="grid">
        <div><span class="value">${support.length ? support.join(", ") : "—"}</span></div>
        <div><span class="value">${resistance.length ? resistance.join(", ") : "—"}</span></div>
        <div><span class="value">${rr}</span></div>
      </div>
    </div>
    <div class="section" style="background: #ecfdf5;">
      <div class="label">Entry / Take profit</div>
      <div class="grid">
        <div><span class="value green">${entry}</span></div>
        <div><span class="value green">${tp}</span></div>
        <div><span class="value green">${tp2}</span></div>
      </div>
    </div>
    <div class="section" style="background: #fef2f2;">
      <div class="label">Stop loss</div>
      <div class="grid">
        <div><span class="value red">${sl}</span></div>
        <div><span class="value red">${sl2}</span></div>
        <div></div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Compose chart + analysis into a single PNG (Chart Analytic style).
 * @param {string} chartImagePath - Path to the chart PNG (e.g. TradingView capture).
 * @param {object} analysis - Analysis result (marketBias, support, resistance, etc.).
 * @param {string} outPath - Where to save the composed PNG.
 * @param {{ pairLabel?: string }} options - Optional pair label for header (e.g. "EUR/USD 1H").
 * @returns {Promise<string>} Resolved with outPath.
 */
async function composeExportImage(chartImagePath, analysis, outPath, options = {}) {
  const buffer = await fs.readFile(chartImagePath);
  const base64 = buffer.toString("base64");
  const chartDataUrl = `data:image/png;base64,${base64}`;
  const pairLabel = options.pairLabel || "";

  const html = buildExportHtml(chartDataUrl, analysis, pairLabel);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: EXPORT_WIDTH + 32, height: 800, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    // Wait for chart image to decode so screenshot isn’t blank
    await page.evaluate(async () => {
      const img = document.querySelector(".chart-wrap img");
      if (img && !img.complete) await new Promise((r, e) => { img.onload = r; img.onerror = e; });
    });
    const el = await page.$("#capture");
    if (!el) throw new Error("Export card element not found");
    await el.screenshot({ path: outPath, type: "png" });
  } finally {
    await browser.close();
  }

  return outPath;
}

module.exports = { composeExportImage, buildExportHtml };
