#!/usr/bin/env node
/**
 * Test proxy or proxy list: call Polymarket geoblock API and report if trading is allowed.
 * Usage:
 *   PROXY_URL=http://host:port node social-agent/test-proxy.js
 *   PROXY_LIST_URL=https://.../http.txt node social-agent/test-proxy.js
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

async function selectFromList(listUrl, maxTry = 30) {
  const res = await fetch(listUrl);
  const text = await res.text();
  const lines = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("#") && /^[\d.]+:\d+$/.test(s));
  const toTry = lines.slice(0, maxTry);
  for (let i = 0; i < toTry.length; i++) {
    const line = toTry[i];
    const proxyUrl = `http://${line}`;
    process.stderr.write(`  Trying ${i + 1}/${toTry.length}: ${line} ... `);
    try {
      const geo = await checkViaProxy(proxyUrl);
      process.stderr.write(geo.blocked ? "blocked\n" : "OK\n");
      return { proxyUrl, ...geo };
    } catch (e) {
      process.stderr.write(`${e.message || "fail"}\n`);
    }
  }
  return null;
}

async function main() {
  const proxyUrl = (process.env.PROXY_URL || process.env.HTTP_PROXY || process.env.HTTPS_PROXY || "").trim();
  const listUrl = (process.env.PROXY_LIST_URL || "").trim();

  if (listUrl) {
    console.log("Testing PROXY_LIST_URL (trying up to 30 proxies, 8s timeout each)...");
    const result = await selectFromList(listUrl);
    if (result) {
      console.log("First working proxy:", result.proxyUrl);
      console.log("Geoblock:", result.blocked ? "BLOCKED" : "OK (trading allowed)");
      console.log("Country:", result.country || "?", "Region:", result.region || "?");
      process.exitCode = result.blocked ? 1 : 0;
      return;
    }
    console.error("No proxy from list passed the geoblock check.");
    process.exitCode = 1;
    return;
  }

  if (proxyUrl) {
    console.log("Testing PROXY_URL:", proxyUrl);
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
