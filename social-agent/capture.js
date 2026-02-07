/**
 * Capture a TradingView chart as PNG using Puppeteer.
 * Uses programmatic screenshot (chart container clip) by default; set useScreenshotShortcut: true to use TradingView Ctrl+Alt+S instead.
 * Ensures the chart is loaded with the correct timeframe (from URL) before capture.
 * Requires: npm install puppeteer
 * TradingView may block headless browsers; use headed or a residential proxy if needed.
 */

const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");

/** Timeframe labels TradingView shows in the toolbar; we wait for one of these to be visible. */
const TIMEFRAME_LABELS = {
  "15M": ["15", "15m", "15M"],
  "1H": ["1H", "1h", "60"],
  "4H": ["4H", "4h", "240"],
};

/**
 * Wait until the chart shows the expected timeframe (toolbar label) or timeout.
 * @param {import('puppeteer').Page} page
 * @param {string} timeframe - e.g. "15M", "1H", "4H"
 * @param {number} timeoutMs
 * @returns {Promise<boolean>} true if timeframe was detected
 */
async function waitForTimeframe(page, timeframe, timeoutMs = 15000) {
  const labels = TIMEFRAME_LABELS[timeframe] || [timeframe];
  const deadline = Date.now() + timeoutMs;
  const pollMs = 500;

  while (Date.now() < deadline) {
    const found = await page.evaluate((expectedLabels) => {
      const text = document.body.innerText || "";
      const lower = text.toLowerCase();
      for (const label of expectedLabels) {
        if (label.length <= 3) {
          // Match "15" or "1H" as a word/token so we don't match "150" or "215"
          const re = new RegExp("(^|[^0-9a-zA-Z])" + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^0-9a-zA-Z]|$)", "i");
          if (re.test(text)) return true;
        }
        if (lower.includes(label.toLowerCase())) return true;
      }
      return false;
    }, labels);
    if (found) return true;
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return false;
}

/**
 * Wait for a new file to appear in dir (excluding .crdownload). Returns path to the new file or null.
 * @param {string} dir - absolute path
 * @param {number} timeoutMs
 * @param {Set<string>} before - filenames present before trigger
 */
async function waitForDownload(dir, timeoutMs, before) {
  const deadline = Date.now() + timeoutMs;
  const pollMs = 300;
  while (Date.now() < deadline) {
    const names = fsSync.readdirSync(dir);
    const done = names.find(
      (f) => !f.endsWith(".crdownload") && !before.has(f)
    );
    if (done) return path.join(dir, done);
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return null;
}

/**
 * Trigger Ctrl+Alt+S then optionally try to click a snapshot "Save" / "Download" button.
 */
async function triggerScreenshotShortcut(page) {
  await page.keyboard.down("Control");
  await page.keyboard.down("Alt");
  await page.keyboard.press("s");
  await page.keyboard.up("Alt");
  await page.keyboard.up("Control");
  await new Promise((r) => setTimeout(r, 800));
  // If a snapshot modal opened, try to click "Save chart image" / "Download"
  const clicked = await page.evaluate(() => {
    const text = ["Save chart image", "Download", "Save image", "Save"];
    for (const t of text) {
      const el = Array.from(document.querySelectorAll("button, a, [role=button], span, div")).find(
        (n) => n.innerText && n.innerText.includes(t)
      );
      if (el) {
        el.click();
        return true;
      }
    }
    return false;
  });
  if (clicked) await new Promise((r) => setTimeout(r, 500));
}

async function captureChart(url, outputPath, options = {}) {
  const puppeteer = require("puppeteer");
  const { getChromeLaunchOptions } = require("./puppeteer-render");
  const {
    viewportWidth = 1920,
    viewportHeight = 1080,
    waitMs = 3000,
    /** Schedule object { timeframe, interval, url } — if set, we wait for this timeframe to be visible */
    schedule = null,
    /** Use Ctrl+Alt+S and browser download instead of programmatic screenshot (default: false = use Puppeteer screenshot only) */
    useScreenshotShortcut = false,
  } = options;

  const browser = await puppeteer.launch({
    headless: true,
    ...getChromeLaunchOptions(),
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: viewportWidth, height: viewportHeight, deviceScaleFactor: 2 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const outDir = path.dirname(outputPath);
    await fs.mkdir(outDir, { recursive: true });
    const absOutDir = path.resolve(outDir);

    if (useScreenshotShortcut) {
      const client = await page.target().createCDPSession();
      await client.send("Page.setDownloadBehavior", {
        behavior: "allow",
        downloadPath: absOutDir,
      });
    }

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    const chartSelector = '[data-name="chart-container"]';
    await page.waitForSelector(chartSelector, { timeout: 10000 }).catch(() => null);

    if (schedule && schedule.timeframe) {
      const detected = await waitForTimeframe(page, schedule.timeframe, 15000);
      if (!detected) {
        console.warn(
          `[capture] Timeframe "${schedule.timeframe}" not detected in toolbar; capturing anyway.`
        );
      }
    }
    await new Promise((r) => setTimeout(r, waitMs));

    // On Render, extra 3s for chart to fully render before Ctrl+Alt+S (slower env)
    if (process.env.RENDER) {
      console.log("[capture] Render: extra 3s for chart to settle before screenshot...");
      await new Promise((r) => setTimeout(r, 3000));
    }

    // Slight viewport nudge + scroll to encourage TradingView to sync price axis with chart (no extra delay)
    const chartEl = await page.$(chartSelector).catch(() => null);
    if (chartEl) {
      await page.setViewport({ width: viewportWidth + 1, height: viewportHeight, deviceScaleFactor: 2 });
      await page.setViewport({ width: viewportWidth, height: viewportHeight, deviceScaleFactor: 2 });
      const box = await chartEl.boundingBox();
      if (box) {
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        await page.mouse.move(centerX, centerY);
        await page.mouse.wheel({ deltaY: 40 });
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    if (useScreenshotShortcut) {
      const before = new Set(fsSync.readdirSync(absOutDir));
      await triggerScreenshotShortcut(page);
      const downloaded = await waitForDownload(absOutDir, 12000, before);
      if (downloaded && downloaded !== outputPath) {
        await fs.rename(downloaded, outputPath);
      }
      try {
        const stat = await fs.stat(outputPath);
        return { path: outputPath, size: stat.size };
      } catch (e) {
        console.warn("[capture] Shortcut did not produce a download, falling back to programmatic screenshot.");
      }
    }

    // Enter full screen (Shift+F) before programmatic screenshot so chart fills viewport
    await page.keyboard.down("Shift");
    await page.keyboard.press("f");
    await page.keyboard.up("Shift");
    await new Promise((r) => setTimeout(r, 500));

    await page.screenshot({
      path: outputPath,
      type: "png",
    });

    const stat = await fs.stat(outputPath);
    return { path: outputPath, size: stat.size };
  } finally {
    await browser.close();
  }
}

module.exports = { captureChart };
