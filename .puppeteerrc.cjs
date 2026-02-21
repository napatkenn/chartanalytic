/**
 * Puppeteer cache in project so Chrome installed at build time is found at runtime (e.g. Render cron).
 * See https://pptr.dev/guides/configuration
 */
const { join } = require("path");

/** @type {import("puppeteer").Configuration} */
module.exports = {
  cacheDirectory: join(__dirname, ".cache", "puppeteer"),
};
