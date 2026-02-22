/**
 * On ephemeral runners (e.g. GitHub Actions), the filesystem may not have .cache from build.
 * We point Puppeteer at project .cache and, if Chrome is missing, install it at runtime.
 */
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

function findChromeInCache(cacheDir) {
  const chromeDir = path.join(cacheDir, "chrome");
  if (!fs.existsSync(chromeDir)) return null;
  let entries;
  try {
    entries = fs.readdirSync(chromeDir);
  } catch {
    return null;
  }
  const linuxDir = entries.find((e) => e.startsWith("linux-"));
  if (!linuxDir) return null;
  // Puppeteer 19+: chrome/linux-<revision>/chrome-linux64/chrome
  const candidate = path.join(chromeDir, linuxDir, "chrome-linux64", "chrome");
  if (fs.existsSync(candidate)) return candidate;
  // Fallback: some layouts use chrome-linux/chrome
  const alt = path.join(chromeDir, linuxDir, "chrome-linux", "chrome");
  if (fs.existsSync(alt)) return alt;
  return null;
}

/** Install Chrome into cacheDir if missing (for ephemeral fs, e.g. GitHub Actions). */
function installChromeIfNeeded(cacheDir, projectRoot) {
  if (process.env.PUPPETEER_SKIP_RUNTIME_INSTALL === "true") return;
  if (process.platform !== "linux") return;
  if (findChromeInCache(cacheDir)) return;
  try {
    console.log("[puppeteer] Chrome not in cache; installing (this may take 1–2 min)...");
    execSync("npx puppeteer browsers install chrome", {
      env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDir },
      cwd: projectRoot,
      stdio: "inherit",
    });
  } catch (e) {
    console.warn("[puppeteer] Runtime install failed:", e.message);
  }
}

function getChromeLaunchOptions() {
  const args = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"];
  // Proxy is not used for capture (only for Polymarket API in polymarket.js) so TradingView loads direct
  const opts = { args };
  const projectRoot = path.resolve(__dirname, "..");
  const defaultCacheDir = path.join(projectRoot, ".cache", "puppeteer");
  const cacheDir = process.env.PUPPETEER_CACHE_DIR
    ? path.isAbsolute(process.env.PUPPETEER_CACHE_DIR)
      ? process.env.PUPPETEER_CACHE_DIR
      : path.join(projectRoot, process.env.PUPPETEER_CACHE_DIR)
    : defaultCacheDir;

  installChromeIfNeeded(cacheDir, projectRoot);

  const executablePath = findChromeInCache(cacheDir) || process.env.PUPPETEER_EXECUTABLE_PATH;
  if (executablePath && fs.existsSync(executablePath)) opts.executablePath = executablePath;
  return opts;
}

module.exports = { getChromeLaunchOptions };
