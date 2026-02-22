#!/usr/bin/env node
/**
 * Test proxy: call Polymarket geoblock API and report if trading is allowed.
 * Usage:
 *   PROXY_URL=http://user:pass@host:port node social-agent/test-proxy.js
 *   node social-agent/test-proxy.js   (no proxy; shows your current IP's geoblock status)
 */

const GEOBLOCK_URL = "https://polymarket.com/api/geoblock";

async function checkDirect() {
  const res = await fetch(GEOBLOCK_URL);
  const data = await res.json().catch(() => ({}));
  return { blocked: Boolean(data.blocked), country: data.country, region: data.region };
}

async function checkViaProxy(proxyUrl, timeoutMs = 8000) {
  const https = require("https");
  const { HttpsProxyAgent } = require("https-proxy-agent");
  return new Promise((resolve, reject) => {
    const agent = new HttpsProxyAgent(proxyUrl);
    const req = https.get(GEOBLOCK_URL, { agent }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try {
          const data = JSON.parse(body);
          resolve({ blocked: Boolean(data.blocked), country: data.country, region: data.region });
        } catch {
          reject(new Error("Invalid JSON"));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error("Timeout")); });
  });
}

async function main() {
  const proxyUrl = (process.env.PROXY_URL || process.env.HTTP_PROXY || process.env.HTTPS_PROXY || "").trim();

  if (proxyUrl) {
    console.log("Testing PROXY_URL:", proxyUrl.replace(/:[^:@]+@/, ":****@"));
    try {
      const geo = await checkViaProxy(proxyUrl);
      console.log("Geoblock:", geo.blocked ? "BLOCKED" : "OK (trading allowed)");
      console.log("Country:", geo.country || "?", "Region:", geo.region || "?");
      process.exitCode = geo.blocked ? 1 : 0;
    } catch (err) {
      console.error("Proxy request failed:", err.message);
      process.exitCode = 1;
    }
    return;
  }

  console.log("No proxy set. Checking geoblock for current IP...");
  try {
    const geo = await checkDirect();
    console.log("Geoblock:", geo.blocked ? "BLOCKED" : "OK (trading allowed)");
    console.log("Country:", geo.country || "?", "Region:", geo.region || "?");
    process.exitCode = geo.blocked ? 1 : 0;
  } catch (err) {
    console.error("Request failed:", err.message);
    process.exitCode = 1;
  }
}

main();
