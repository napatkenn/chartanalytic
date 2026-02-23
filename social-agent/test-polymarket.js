#!/usr/bin/env node
/**
 * Test Polymarket flow without running Puppeteer or OpenAI.
 * Usage:
 *   node test-polymarket.js --redeem  Only claim/redeem resolved positions (needs POLYMARKET_* + POLY_BUILDER_*)
 *   node test-polymarket.js           Test market discovery only (no key needed)
 *   node test-polymarket.js --dry     Dry-run placePrediction with fake analysis (no real order)
 *   node test-polymarket.js --live    Real order (needs POLYMARKET_PRIVATE_KEY, uses small size)
 *
 * Loads .env from project root. Set POLYMARKET_PRIVATE_KEY for --dry/--live.
 */

const path = require("path");

// Load .env from project root
const rootEnv = path.resolve(__dirname, "..", ".env");
try {
  const content = require("fs").readFileSync(rootEnv, "utf8");
  content.split("\n").forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  });
} catch {
  // .env optional
}

const polymarket = require("./polymarket");
const { getScheduleById } = require("./config");

async function main() {
  const args = process.argv.slice(2);
  const redeemOnly = args.includes("--redeem");
  const dryRun = args.includes("--dry");
  if (redeemOnly) {
    console.log("=== Redeem only: claiming resolved Polymarket positions ===\n");
    await polymarket.claimResolvedPositions();
    return;
  }

  const live = args.includes("--live");

  console.log("=== 1. Market discovery (15-min preferred, then any crypto) ===\n");
  for (const asset of ["btc", "eth", "sol", "xrp"]) {
    try {
      const market = await polymarket.findCryptoMarket(asset);
      if (market) {
        const is15m = (market.slug || "").toLowerCase().includes("15m") && (market.slug || "").toLowerCase().includes("updown");
        const kind = is15m ? "15-min" : "fallback";
        console.log(`[${asset}] (${kind}) ${market.question}`);
        console.log(`      conditionId: ${market.conditionId?.slice(0, 18)}...`);
        console.log(`      tokens: Yes ${market.clobTokenIds?.[0]?.slice(0, 12)}... No ${market.clobTokenIds?.[1]?.slice(0, 12)}...\n`);
      } else {
        console.log(`[${asset}] No active market found.\n`);
      }
    } catch (e) {
      console.log(`[${asset}] Error: ${e.message}\n`);
    }
  }

  if (!dryRun && !live) {
    console.log("To test order logic: node test-polymarket.js --dry");
    console.log("To place a small real order: node test-polymarket.js --live");
    return;
  }

  const schedule = getScheduleById("btc");
  const fakeAnalysis = {
    marketBias: "bullish",
    confidence: 75,
    support: ["95000"],
    resistance: ["98000"],
    reasoning: "Test run",
  };

  console.log("=== 2. Place prediction (dry-run = no real order) ===\n");
  console.log("Schedule:", schedule?.name, "| Analysis: bullish, 75% confidence\n");

  try {
    const result = await polymarket.placePrediction(schedule, fakeAnalysis, {
      dryRun: dryRun || !live,
    });
    console.log("Result:", result.message);
    if (result.orderId) console.log("Order ID:", result.orderId);
  } catch (e) {
    console.error("Error:", e.message);
    if (live && !polymarket.isConfigured()) {
      console.error("\nSet POLYMARKET_PRIVATE_KEY=0x... in .env for real orders.");
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
