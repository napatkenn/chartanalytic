/**
 * On Render, Chrome is installed into .cache/puppeteer during build but the runtime
 * still looks at /opt/render/.cache/puppeteer. Return launch options so we use the
 * Chrome binary inside the project (executablePath so Puppeteer does not resolve cache itself).
 */
const path = require("path");
const fs = require("fs");

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

function getChromeLaunchOptions() {
  const opts = { args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] };
  const projectRoot = path.resolve(__dirname, "..");
  const defaultCacheDir = path.join(projectRoot, ".cache", "puppeteer");
  const cacheDir = process.env.PUPPETEER_CACHE_DIR
    ? path.isAbsolute(process.env.PUPPETEER_CACHE_DIR)
      ? process.env.PUPPETEER_CACHE_DIR
      : path.join(projectRoot, process.env.PUPPETEER_CACHE_DIR)
    : defaultCacheDir;

  const executablePath = findChromeInCache(cacheDir);
  if (executablePath) opts.executablePath = executablePath;
  return opts;
}

module.exports = { getChromeLaunchOptions };
