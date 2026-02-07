/**
 * On Render, Chrome is installed into .cache/puppeteer during build but the runtime
 * still looks at /opt/render/.cache/puppeteer. Return launch options so we use the
 * Chrome binary inside the project.
 */
const path = require("path");
const fs = require("fs");

function getChromeLaunchOptions() {
  const opts = { args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] };
  // Resolve project root (parent of social-agent) so we find .cache/puppeteer regardless of cwd
  const projectRoot = path.resolve(__dirname, "..");
  const defaultCacheDir = path.join(projectRoot, ".cache", "puppeteer");
  const cacheDir = process.env.PUPPETEER_CACHE_DIR
    ? path.isAbsolute(process.env.PUPPETEER_CACHE_DIR)
      ? process.env.PUPPETEER_CACHE_DIR
      : path.join(projectRoot, process.env.PUPPETEER_CACHE_DIR)
    : process.env.RENDER === "true"
      ? defaultCacheDir
      : null;
  if (!cacheDir) return opts;

  const chromeDir = path.join(cacheDir, "chrome");
  try {
    const entries = fs.readdirSync(chromeDir);
    const linuxDir = entries.find((e) => e.startsWith("linux-"));
    if (!linuxDir) return opts;
    const executablePath = path.join(chromeDir, linuxDir, "chrome-linux64", "chrome");
    if (fs.existsSync(executablePath)) {
      opts.executablePath = executablePath;
    }
  } catch (_) {}
  return opts;
}

module.exports = { getChromeLaunchOptions };
