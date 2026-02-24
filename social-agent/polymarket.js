/**
 * Polymarket prediction integration: find crypto markets via Gamma API and place
 * orders via CLOB using chart analysis (marketBias + confidence).
 * Requires: POLYMARKET_PRIVATE_KEY (wallet with USDC.e on Polygon), optional
 * POLYMARKET_MIN_CONFIDENCE, POLYMARKET_MAX_SIZE_USD.
 * Proxy (PROXY_URL) is used only for Polymarket API calls in this file, not for capture/OpenAI.
 */

const GAMMA_API = "https://gamma-api.polymarket.com";
const DATA_API = "https://data-api.polymarket.com";
const CLOB_HOST = "https://clob.polymarket.com";
/** GET https://polymarket.com/api/geoblock — used before any CLOB order to check if IP is allowed to trade. */
const GEOBLOCK_URL = "https://polymarket.com/api/geoblock";
const CHAIN_ID = 137; // Polygon
const RELAYER_URL = "https://relayer-v2.polymarket.com/";
const USDC_E = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const CTF_SPENDER = "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045";
let gaslessApprovalDone = false;

const proxyUrl = (process.env.PROXY_URL || process.env.HTTP_PROXY || process.env.HTTPS_PROXY || "").trim();
let proxyAgent = null;
if (proxyUrl) {
  try {
    const undici = require("undici");
    proxyAgent = new undici.ProxyAgent(proxyUrl);
  } catch (_) {}
}

/** Fetch that uses proxy only for Polymarket API (geoblock, Gamma, CLOB). */
function pmFetch(url, init) {
  if (proxyAgent) return require("undici").fetch(url, { ...init, dispatcher: proxyAgent });
  return fetch(url, init);
}

/** Retry a fetch-based fn a few times on network failure (e.g. Render transient "fetch failed"). */
async function withFetchRetry(fn, opts = {}) {
  const { retries = 2, delayMs = 2000 } = opts;
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = (e?.message || String(e)).toLowerCase();
      const cause = (e?.cause?.message || e?.cause?.code || "").toLowerCase();
      const isNetwork = msg.includes("fetch failed") || /econnrefused|etimedout|enotfound|eai_again|network|socket/i.test(msg + cause);
      if (i < retries && isNetwork) {
        if (i > 0) console.warn("[polymarket] Retry after network error:", e.message);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

/**
 * Check if the current IP is geoblocked by Polymarket (no trading).
 * @returns {Promise<{ blocked: boolean, country?: string, region?: string }>}
 */
async function checkGeoblock() {
  try {
    const res = await pmFetch(GEOBLOCK_URL);
    const data = await res.json().catch(() => ({}));
    return {
      blocked: Boolean(data.blocked),
      country: data.country,
      region: data.region,
    };
  } catch {
    return { blocked: false };
  }
}

const ASSET_SEARCH_QUERIES = {
  btc: "Bitcoin",
  eth: "Ethereum",
  sol: "Solana",
  xrp: "XRP",
};

/** Polymarket 15-minute up/down slug prefixes for event listing (e.g. btc-updown-15m-1765788300). */
const ASSET_15M_SLUG_PREFIXES = {
  btc: "btc-updown-15m",
  eth: "eth-updown-15m",
  sol: "sol-updown-15m",
  xrp: "xrp-updown-15m",
};

function marketFromEventMarket(event, m) {
  const ids = m.clobTokenIds || m.clob_token_ids;
  const conditionId = m.conditionId || m.condition_id;
  if (!ids || ids.length < 2 || !conditionId) return null;
  // Prefer full ISO datetime (endDate) for window checks; endDateIso can be date-only and wrong for UTC midnight
  const endDateIso = m.endDate || m.end_date || event.endDate || event.end_date || m.endDateIso || m.end_date_iso || event.endDateIso || event.end_date_iso;
  return {
    conditionId,
    question: m.question || event.title || "",
    clobTokenIds: parseClobTokenIds(ids),
    slug: event.slug || m.slug,
    endDateIso,
  };
}

function parseClobTokenIds(ids) {
  if (Array.isArray(ids)) return ids;
  if (typeof ids === "string") {
    try {
      const parsed = JSON.parse(ids);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return ids.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return ids ? [ids] : [];
}

/** Cached tag IDs for "crypto" and "15 Min" (from Gamma GET /tags). */
let cachedTagIds = null;
/** Known Gamma tag ID for 15-minute up/down markets (slug "15M"); used if /tags doesn't return it. */
const TAG_ID_15M = "102467";

/**
 * Resolve Gamma tag IDs for "crypto" and "15 Min" per https://docs.polymarket.com/market-data/fetching-markets
 * @returns {Promise<{ cryptoTagId: string | null, fifteenMinTagId: string | null }>}
 */
async function getMarketTagIds() {
  if (cachedTagIds) return cachedTagIds;
  try {
    const res = await pmFetch(`${GAMMA_API}/tags`);
    if (!res.ok) return (cachedTagIds = { cryptoTagId: null, fifteenMinTagId: null });
    const tags = await res.json();
    if (!Array.isArray(tags)) return (cachedTagIds = { cryptoTagId: null, fifteenMinTagId: null });
    let cryptoTagId = null;
    let fifteenMinTagId = null;
    const lower = (s) => (s == null ? "" : String(s).toLowerCase());
    for (const t of tags) {
      const label = lower(t.label);
      const slug = lower(t.slug || "");
      if (!cryptoTagId && (label.includes("crypto") || slug === "crypto" || slug === "cryptocurrency")) {
        cryptoTagId = String(t.id);
      }
      // 15M tag (slug "15M" / "15m") returns only 15-minute up/down markets; preferred over "crypto" for 15m
      if (!fifteenMinTagId && (slug === "15m" || label === "15m" || label.includes("15 min") || slug.includes("15-min") || label.includes("15 minute"))) {
        fifteenMinTagId = String(t.id);
      }
      if (cryptoTagId && fifteenMinTagId) break;
    }
    if (!fifteenMinTagId) fifteenMinTagId = TAG_ID_15M;
    cachedTagIds = { cryptoTagId, fifteenMinTagId };
    return cachedTagIds;
  } catch {
    return (cachedTagIds = { cryptoTagId: null, fifteenMinTagId: TAG_ID_15M });
  }
}


/** Return true if market end time is in the future (still open for trading). */
function isMarketEndInFuture(market) {
  const end = market.endDateIso;
  if (!end) return true;
  return new Date(end).getTime() > Date.now();
}

/**
 * Find an active 15-minute up/down market for the asset (tag-based only).
 * Uses Gamma GET /events with tag_id for "crypto" and/or "15 Min", then filters by 15m + asset prefix.
 * @param {string} assetKey - btc | eth | sol | xrp
 * @param {{ excludeConditionId?: string }} options - If set, skip market with this conditionId (e.g. after orderbook expired).
 */
async function findCryptoMarket15Min(assetKey, options = {}) {
  const prefix = ASSET_15M_SLUG_PREFIXES[assetKey];
  if (!prefix) return null;
  const excludeConditionId = (options.excludeConditionId || "").trim().toLowerCase();

  const now = Date.now();
  let best = null;
  let bestEnd = Infinity;

  function consider(out) {
    if (!out || (excludeConditionId && (out.conditionId || "").toLowerCase() === excludeConditionId)) return;
    const endMs = out.endDateIso ? new Date(out.endDateIso).getTime() : 0;
    if (endMs > now && endMs < bestEnd) {
      bestEnd = endMs;
      best = out;
    }
  }

  // Use 15M tag (102467) to get only 15-minute up/down markets; fallback to unfiltered if needed
  const { fifteenMinTagId } = await getMarketTagIds();
  const eventListUrls = [
    ...(fifteenMinTagId ? [`${GAMMA_API}/events?tag_id=${fifteenMinTagId}&limit=100&active=true&closed=false`] : []),
    `${GAMMA_API}/events?active=true&closed=false&limit=100`,
  ];
  for (const url of eventListUrls) {
    const res = await pmFetch(url);
    if (!res.ok) continue;
    const data = await res.json();
    const events = Array.isArray(data) ? data : (data?.value ?? data?.events ?? data?.data ?? []);
    if (!events.length) continue;
    for (const event of events) {
      const slug = (event.slug || "").toLowerCase();
      if (!slug.includes("15m") || !slug.includes("updown")) continue;
      if (!slug.startsWith(prefix)) continue;
      const markets = event.markets || [];
      for (const m of markets) {
        const out = marketFromEventMarket(event, m);
        if (out) consider(out);
      }
      if (best) return best;
    }
  }
  return best;
}

/**
 * Search Polymarket for active crypto markets. Prefers 15-minute up/down markets when available.
 * @param {string} assetKey - 'btc' | 'eth' | 'sol' | 'xrp'
 * @param {{ excludeConditionId?: string }} options - If set, skip market with this conditionId (e.g. orderbook expired).
 * @returns {Promise<{ conditionId: string, question: string, clobTokenIds: string[], slug?: string } | null>}
 */
async function findCryptoMarket(assetKey, options = {}) {
  // 1) Prefer 15-minute markets (align with our 15-min analysis schedule)
  const market15m = await findCryptoMarket15Min(assetKey, options);
  if (market15m) return market15m;

  // 2) Fallback: any active crypto market (daily/monthly etc.)
  const q = ASSET_SEARCH_QUERIES[assetKey] || assetKey;
  const res = await pmFetch(
    `${GAMMA_API}/public-search?q=${encodeURIComponent(q)}&events_status=open&limit_per_type=5`
  );
  if (!res.ok) throw new Error(`Gamma API: ${res.status}`);
  const data = await res.json();

  const events = data.events || [];
  for (const event of events) {
    const markets = event.markets || [];
    for (const m of markets) {
      const out = marketFromEventMarket(event, m);
      if (out) return out;
    }
  }

  const eventsRes = await pmFetch(
    `${GAMMA_API}/events?active=true&closed=false&limit=50&order=volume_24hr&ascending=false`
  );
  if (eventsRes.ok) {
    const eventsList = await eventsRes.json();
    const lowerQ = q.toLowerCase();
    for (const event of eventsList) {
      const title = (event.title || "").toLowerCase();
      if (!title.includes(lowerQ)) continue;
      const markets = event.markets || [];
      for (const m of markets) {
        const out = marketFromEventMarket(event, m);
        if (out) return out;
      }
    }
  }

  const marketsRes = await pmFetch(
    `${GAMMA_API}/markets?active=true&closed=false&limit=100`
  );
  if (marketsRes.ok) {
    const list = await marketsRes.json();
    const lowerQ = q.toLowerCase();
    for (const m of list) {
      const question = (m.question || m.title || "").toLowerCase();
      if (!question.includes(lowerQ)) continue;
      const ids = m.clobTokenIds || m.clob_token_ids;
      const conditionId = m.conditionId || m.condition_id;
      const tokenIds = parseClobTokenIds(ids);
      if (tokenIds.length >= 2 && conditionId) {
        return {
          conditionId,
          question: m.question || m.title || "",
          clobTokenIds: tokenIds,
          slug: m.slug,
        };
      }
    }
  }
  return null;
}

/**
 * Get CLOB client (ethers Wallet + Polymarket API creds). Uses dynamic import for ESM deps.
 * - If POLYMARKET_API_KEY + POLYMARKET_API_SECRET + POLYMARKET_PASSPHRASE are set, use those (from Polymarket UI).
 * - Otherwise derive existing key first (avoids 400 "Could not create api key"), then create only if none exists.
 */
async function getClient() {
  const raw = process.env.POLYMARKET_PRIVATE_KEY;
  const privateKey = typeof raw === "string" ? raw.trim() : "";
  if (!privateKey || !privateKey.startsWith("0x")) {
    throw new Error("POLYMARKET_PRIVATE_KEY (0x...) is required for predictions.");
  }

  const [ethers, clobModule] = await Promise.all([
    import("ethers").then((m) => m.default || m),
    import("@polymarket/clob-client"),
  ]);

  const ClobClient = clobModule.ClobClient ?? clobModule.default?.ClobClient;
  const Side = clobModule.Side ?? clobModule.default?.Side;
  const OrderType = clobModule.OrderType ?? clobModule.default?.OrderType;

  const signer = new ethers.Wallet(privateKey);
  let apiCreds;

  const apiKey = (process.env.POLYMARKET_API_KEY || "").trim();
  const secret = (process.env.POLYMARKET_API_SECRET || "").trim();
  const passphrase = (process.env.POLYMARKET_PASSPHRASE || "").trim();
  if (apiKey && secret && passphrase) {
    apiCreds = { apiKey, secret, passphrase, key: apiKey };
  } else {
    const tempClient = new ClobClient(CLOB_HOST, CHAIN_ID, signer);
    let derived = null;
    try {
      derived = await tempClient.deriveApiKey();
    } catch (_) {}
    if (derived && (derived.apiKey || derived.key)) {
      apiCreds = derived;
      if (!apiCreds.apiKey) apiCreds.apiKey = apiCreds.key;
    } else {
      try {
        apiCreds = await tempClient.createApiKey();
      } catch (_) {
        apiCreds = await tempClient.createOrDeriveApiKey();
      }
      if (apiCreds && !apiCreds.apiKey) apiCreds.apiKey = apiCreds.key;
    }
  }

  // Funder = address that holds USDC.e for the order. Use POLYMARKET_FUNDER_ADDRESS if set (the wallet
  // you see and fund on polymarket.com — different from the relayer's proxy 0xB32...).
  const envFunder = (process.env.POLYMARKET_FUNDER_ADDRESS || "").trim();
  const hasBuilderCreds =
    (process.env.POLY_BUILDER_API_KEY || "").trim() &&
    (process.env.POLY_BUILDER_SECRET || "").trim() &&
    (process.env.POLY_BUILDER_PASSPHRASE || "").trim();
  let signatureType = 0;
  let funderAddress = signer.address;
  if (envFunder && envFunder.startsWith("0x") && envFunder.length === 42) {
    funderAddress = envFunder;
    signatureType = 2; // Proxy/Gnosis Safe — wallet shown on polymarket.com
  } else if (hasBuilderCreds) {
    try {
      const { deriveProxyWallet } = require("@polymarket/builder-relayer-client/dist/builder/derive");
      const { getContractConfig } = require("@polymarket/builder-relayer-client/dist/config");
      const proxyFactory = getContractConfig(CHAIN_ID).ProxyContracts.ProxyFactory;
      funderAddress = deriveProxyWallet(signer.address, proxyFactory);
      signatureType = 2;
    } catch (_) {
      // fallback: keep EOA as funder
    }
  }
  const client = new ClobClient(CLOB_HOST, CHAIN_ID, signer, apiCreds, signatureType, funderAddress);
  return { client, Side, OrderType };
}

/**
 * Map chart analysis to Polymarket side and token.
 * Follow the AI: AI says up (bullish) → buy YES. AI says down (bearish) → buy NO. Range → skip.
 */
function analysisToSide(analysis, marketQuestion) {
  const bias = (analysis.marketBias || "range").toLowerCase();
  if (bias === "range") return null;

  if (bias === "bullish") return { side: "YES", tokenIndex: 0 };
  if (bias === "bearish") return { side: "NO", tokenIndex: 1 };
  return null;
}

/**
 * Get the funder address (wallet that holds positions / USDC.e). Same logic as getClient.
 * Use POLYMARKET_FUNDER_ADDRESS if set; else derive proxy if Builder creds exist; else EOA from private key.
 * @returns {string | null} 0x address or null if no key set
 */
function getFunderAddress() {
  const privateKey = (process.env.POLYMARKET_PRIVATE_KEY || "").trim();
  if (!privateKey || !privateKey.startsWith("0x")) return null;
  const envFunder = (process.env.POLYMARKET_FUNDER_ADDRESS || "").trim();
  if (envFunder && envFunder.startsWith("0x") && envFunder.length === 42) return envFunder;
  const { Wallet } = require("ethers");
  const signer = new Wallet(privateKey);
  let funderAddress = signer.address;
  const hasBuilderCreds =
    (process.env.POLY_BUILDER_API_KEY || "").trim() &&
    (process.env.POLY_BUILDER_SECRET || "").trim() &&
    (process.env.POLY_BUILDER_PASSPHRASE || "").trim();
  if (hasBuilderCreds) {
    try {
      const { deriveProxyWallet } = require("@polymarket/builder-relayer-client/dist/builder/derive");
      const { getContractConfig } = require("@polymarket/builder-relayer-client/dist/config");
      const proxyFactory = getContractConfig(CHAIN_ID).ProxyContracts.ProxyFactory;
      funderAddress = deriveProxyWallet(signer.address, proxyFactory);
    } catch (_) {}
  }
  return funderAddress;
}

/**
 * Run USDC.e approve(CTF) via Polymarket gasless relayer (Builder Program).
 * Requires POLY_BUILDER_API_KEY, POLY_BUILDER_SECRET, POLY_BUILDER_PASSPHRASE.
 * @see https://docs.polymarket.com/trading/gasless
 * @param {string} privateKey - Wallet private key (0x...)
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
async function ensureAllowanceGasless(privateKey) {
  try {
    const key = (process.env.POLY_BUILDER_API_KEY || "").trim();
    const secret = (process.env.POLY_BUILDER_SECRET || "").trim();
    const passphrase = (process.env.POLY_BUILDER_PASSPHRASE || "").trim();
    if (!key || !secret || !passphrase) return { ok: false, message: "Builder credentials not set" };

    const { createWalletClient, http } = require("viem");
    const { privateKeyToAccount } = require("viem/accounts");
    const { polygon } = require("viem/chains");
    const { encodeFunctionData, maxUint256 } = require("viem");
    const { RelayClient, RelayerTxType } = require("@polymarket/builder-relayer-client");
    const { BuilderConfig } = require("@polymarket/builder-signing-sdk");

    const account = privateKeyToAccount(privateKey);
    // Default: Tatum Polygon RPC. Set POLYGON_RPC_URL / TATUM_API_KEY (or POLYGON_RPC_API_KEY) in .env.
    const rpc = (process.env.POLYGON_RPC_URL || "").trim() || "https://polygon-mainnet.gateway.tatum.io";
    const apiKey = (process.env.POLYGON_RPC_API_KEY || process.env.TATUM_API_KEY || "").trim();
    const transportOptions = apiKey
      ? { fetchOptions: { headers: { "x-api-key": apiKey } } }
      : {};
    const wallet = createWalletClient({
      account,
      chain: polygon,
      transport: http(rpc, transportOptions),
    });
    const builderConfig = new BuilderConfig({
      localBuilderCreds: { key, secret, passphrase },
    });
    const client = new RelayClient(RELAYER_URL, CHAIN_ID, wallet, builderConfig, RelayerTxType.PROXY);

    const erc20ApproveAbi = [
      {
        inputs: [
          { name: "_spender", type: "address" },
          { name: "_value", type: "uint256" },
        ],
        name: "approve",
        outputs: [{ type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
      },
    ];
    const data = encodeFunctionData({
      abi: erc20ApproveAbi,
      functionName: "approve",
      args: [CTF_SPENDER, maxUint256],
    });
    const response = await client.execute(
      [{ to: USDC_E, data, value: "0" }],
      "Approve USDC.e for CTF"
    );
    const result = await response.wait();
    if (!result) return { ok: false, message: "Gasless approve failed on-chain (relayer reported failed)." };
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e?.message || String(e) };
  }
}

/** parentCollectionId for Polymarket binary markets (32 zero bytes). */
const PARENT_COLLECTION_ID = "0x" + "00".repeat(32);

/**
 * Fetch redeemable positions from Data API and redeem them gaslessly (no RPC).
 * Call after predict flow. Skips if no key, no Builder creds, or no redeemable positions.
 */
async function claimResolvedPositions() {
  try {
    const key = (process.env.POLY_BUILDER_API_KEY || "").trim();
    const secret = (process.env.POLY_BUILDER_SECRET || "").trim();
    const passphrase = (process.env.POLY_BUILDER_PASSPHRASE || "").trim();
    if (!key || !secret || !passphrase) {
      console.warn("[polymarket] Builder credentials not set; skipping claim.");
      return;
    }

    const privateKey = (
      (process.env.POLYMARKET_REDEEM_PRIVATE_KEY || "").trim() ||
      (process.env.POLYMARKET_PRIVATE_KEY || "").trim()
    );
    if (!privateKey || !privateKey.startsWith("0x")) {
      console.warn("[polymarket] No POLYMARKET_PRIVATE_KEY (or POLYMARKET_REDEEM_PRIVATE_KEY); skipping claim.");
      return;
    }

    // Key's proxy = address that receives redeemed USDC (relayer only pays out to this).
    let keyProxy;
    try {
      const { getContractConfig } = require("@polymarket/builder-relayer-client/dist/config");
      const { deriveProxyWallet } = require("@polymarket/builder-relayer-client/dist/builder/derive");
      const { Wallet } = require("ethers");
      const signer = new Wallet(privateKey);
      const proxyFactory = getContractConfig(CHAIN_ID).ProxyContracts.ProxyFactory;
      keyProxy = deriveProxyWallet(signer.address, proxyFactory);
    } catch (e) {
      const { privateKeyToAccount } = require("viem/accounts");
      keyProxy = privateKeyToAccount(privateKey).address;
    }
    if (!keyProxy) return;

    const envFunder = (process.env.POLYMARKET_FUNDER_ADDRESS || "").trim().match(/^0x[a-fA-F0-9]{40}$/)?.[0];
    // Query positions for POLYMARKET_FUNDER_ADDRESS when set (e.g. UI wallet), else key's proxy.
    const queryFunder = envFunder || keyProxy;
    console.log("[polymarket] Checking redeemable positions for", queryFunder, envFunder ? "(POLYMARKET_FUNDER_ADDRESS)" : "(Builder proxy)");
    const url = `${DATA_API}/positions?user=${encodeURIComponent(queryFunder)}&redeemable=true&limit=100`;
    const res = await pmFetch(url);
    if (!res.ok) {
      console.warn("[polymarket] Claim: Data API positions failed", res.status);
      return;
    }
    const positions = await res.json().catch(() => []);
    if (!Array.isArray(positions) || positions.length === 0) {
      console.log("[polymarket] No redeemable positions for", queryFunder);
      return;
    }

    if (envFunder && envFunder.toLowerCase() !== keyProxy.toLowerCase()) {
      console.warn("[polymarket] Positions are for", envFunder, "but redeeming would send USDC to the key's proxy", keyProxy, "only.");
      console.warn("[polymarket] To claim these to your UI wallet, set POLYMARKET_REDEEM_PRIVATE_KEY to the key whose Builder proxy is", envFunder + ", then run again.");
      return;
    }

    const funder = keyProxy;

    // Build per-condition list of winning index sets only (redeemable = winning).
    // CTF: outcomeIndex 0 → indexSet 1 (Yes), outcomeIndex 1 → indexSet 2 (No).
    const conditionToIndexSets = new Map();
    for (const p of positions) {
      const cid = p.conditionId;
      if (!cid) continue;
      if (!conditionToIndexSets.has(cid)) conditionToIndexSets.set(cid, new Set());
      const oi = p.outcomeIndex;
      if (typeof oi === "number") {
        const indexSet = oi === 1 ? 2 : 1; // outcomeIndex 0 → 1, 1 → 2
        conditionToIndexSets.get(cid).add(indexSet);
      } else {
        conditionToIndexSets.get(cid).add(1).add(2); // fallback: both outcomes
      }
    }
    let conditionIds = [...conditionToIndexSets.keys()];
    if (conditionIds.length === 0) return;

    console.log("[polymarket] Data API:",
      positions.length, "redeemable position(s) across", conditionIds.length, "condition(s) (markets)");
    console.log("[polymarket] Redeeming", conditionIds.length, "condition(s). Claimed USDC will be sent to", funder);

    const maxPerRun = Number(process.env.POLYMARKET_REDEEM_MAX_PER_RUN) || 0;
    if (maxPerRun > 0 && conditionIds.length > maxPerRun) {
      conditionIds = conditionIds.slice(0, maxPerRun);
      console.log("[polymarket] Limiting to first", maxPerRun, "conditions (POLYMARKET_REDEEM_MAX_PER_RUN). Run again to redeem the rest.");
    }

    const { createWalletClient, http } = require("viem");
    const { privateKeyToAccount } = require("viem/accounts");
    const { polygon } = require("viem/chains");
    const { encodeFunctionData } = require("viem");
    const { RelayClient, RelayerTxType } = require("@polymarket/builder-relayer-client");
    const { BuilderConfig } = require("@polymarket/builder-signing-sdk");

    const account = privateKeyToAccount(privateKey);
    // Redeem: same RPC as rest of Polymarket (default Tatum). Set TATUM_API_KEY or POLYGON_RPC_API_KEY in .env.
    const rpc = (process.env.POLYGON_RPC_URL || "").trim() || "https://polygon-mainnet.gateway.tatum.io";
    const apiKey = (process.env.POLYGON_RPC_API_KEY || process.env.TATUM_API_KEY || "").trim();
    const transportOptions = apiKey ? { fetchOptions: { headers: { "x-api-key": apiKey } } } : {};
    const wallet = createWalletClient({
      account,
      chain: polygon,
      transport: http(rpc, transportOptions),
    });
    const builderConfig = new BuilderConfig({
      localBuilderCreds: { key, secret, passphrase },
    });
    const client = new RelayClient(RELAYER_URL, CHAIN_ID, wallet, builderConfig, RelayerTxType.PROXY);

    const redeemAbi = [
      {
        name: "redeemPositions",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
          { name: "collateralToken", type: "address" },
          { name: "parentCollectionId", type: "bytes32" },
          { name: "conditionId", type: "bytes32" },
          { name: "indexSets", type: "uint256[]" },
        ],
        outputs: [],
      },
    ];

    const redeemDelayMs = Number(process.env.POLYMARKET_REDEEM_DELAY_MS) || 5000;
    for (let i = 0; i < conditionIds.length; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, redeemDelayMs));
      const conditionId = conditionIds[i];
      try {
        const indexSets = [...(conditionToIndexSets.get(conditionId) || [])].sort((a, b) => a - b);
        if (indexSets.length === 0) continue;
        const data = encodeFunctionData({
          abi: redeemAbi,
          functionName: "redeemPositions",
          args: [USDC_E, PARENT_COLLECTION_ID, conditionId, indexSets],
        });
        const response = await client.execute(
          [{ to: CTF_SPENDER, data, value: "0" }],
          "Redeem positions"
        );
        const result = await response.wait();
        if (result) {
          const txHash = result.transactionHash || response.transactionHash;
          console.log("[polymarket] Redeemed", conditionId, txHash ? `(tx: ${txHash})` : "");
          if (txHash) {
            console.log("[polymarket] Verify on Polygonscan: https://polygonscan.com/tx/" + txHash);
          }
          // If USDC didn't increase: redemption credits the proxy wallet; check that address or withdraw from Polymarket.
        } else {
          console.warn("[polymarket] Redeem failed for", conditionId, "(relayer reported failed or timed out)");
        }
      } catch (e) {
        const status = e?.response?.status ?? e?.status;
        const errStr = JSON.stringify(e?.data || e?.message || e || "");
        const is429 = status === 429 || /quota exceeded|429|Too Many Requests/i.test(errStr);
        if (is429) {
          const resetSec = (e?.data?.error && String(e.data.error).match(/resets in (\d+) seconds/)?.[1]) || "~900";
          console.warn("[polymarket] Redeem rate limited (429) for", conditionId, "— Polymarket relayer quota, not RPC. Wait", resetSec, "s or set POLYMARKET_REDEEM_DELAY_MS=10000 to space out redeems.");
        } else {
          console.warn("[polymarket] Redeem error for", conditionId, e?.message || e);
        }
      }
    }
  } catch (e) {
    console.warn("[polymarket] Claim resolved failed:", e?.message || e);
  }
}

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(message || `Timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Place a prediction on Polymarket based on chart analysis.
 * @param {object} schedule - Schedule from config (id, name, polymarketAsset)
 * @param {object} analysis - Result from analyzeImage (marketBias, confidence, ...)
 * @param {object} options - { dryRun?, minConfidence?, maxSizeUsd? }
 * @returns {Promise<{ placed: boolean, orderId?: string, message: string }>}
 */
async function placePrediction(schedule, analysis, options = {}) {
  const dryRun = options.dryRun === true;
  const minConfidence = Number(process.env.POLYMARKET_MIN_CONFIDENCE) || 60;
  const MIN_ORDER_USD = 10;
  const MAX_ORDER_USD = 20;
  const envMaxSize = Number(process.env.POLYMARKET_MAX_SIZE_USD);
  const capMax = Number.isFinite(envMaxSize) && envMaxSize > 0 ? Math.min(MAX_ORDER_USD, envMaxSize) : MAX_ORDER_USD;

  const assetKey = schedule.polymarketAsset;
  if (!assetKey) {
    return { placed: false, message: `Schedule ${schedule.id} has no polymarketAsset; skip prediction.` };
  }

  const confidence = analysis.confidence != null ? Number(analysis.confidence) : 0;
  if (confidence < minConfidence) {
    return { placed: false, message: `Confidence ${confidence}% below min ${minConfidence}%; skip.` };
  }

  // Order size scales with confidence: $1 per 2% above min (60% -> $10, 62% -> $11, ..., 80%+ -> $20)
  const steps = Math.max(0, Math.floor((confidence - minConfidence) / 2));
  const sizeByConfidence = MIN_ORDER_USD + steps;
  const sizeUsdClamped = Math.max(MIN_ORDER_USD, Math.min(capMax, sizeByConfidence));
  if (capMax < MAX_ORDER_USD && sizeByConfidence > capMax) {
    console.log("[polymarket] Order size $" + sizeByConfidence + " (" + confidence + "%) capped to $" + capMax + " by POLYMARKET_MAX_SIZE_USD.");
  }

  const sideInfo = analysisToSide(analysis, null);
  if (!sideInfo) {
    return { placed: false, message: "Market bias is range; no prediction." };
  }

  // Only 15m up/down markets (no fallback to daily/other crypto markets)
  let market = await withFetchRetry(() => findCryptoMarket15Min(assetKey), { retries: 2, delayMs: 2000 });
  if (!market) {
    return { placed: false, message: `No active 15m up/down Polymarket found for ${assetKey}.` };
  }

  let tokenId = market.clobTokenIds[sideInfo.tokenIndex];
  if (!tokenId) {
    return { placed: false, message: "Missing token ID for chosen side." };
  }

  if (dryRun) {
    return {
      placed: false,
      message: `[DRY-RUN] Would place ${sideInfo.side} $${sizeUsdClamped} on "${market.question}" (confidence ${confidence}%).`,
    };
  }

  const geo = await withFetchRetry(checkGeoblock, { retries: 2, delayMs: 2000 });
  if (geo.blocked) {
    return {
      placed: false,
      message: `Trading restricted in your region (${geo.country || "unknown"}). Run the bot from a non-blocked region. See https://docs.polymarket.com/developers/CLOB/geoblock`,
    };
  }

  // Bootstrap proxy first so relayer + CLOB both use it
  if (proxyUrl) {
    process.env.GLOBAL_AGENT_HTTP_PROXY = proxyUrl;
    process.env.GLOBAL_AGENT_HTTPS_PROXY = proxyUrl;
    try {
      require("global-agent/bootstrap");
    } catch (_) {}
  }
  // Also set undici global dispatcher for any fetch used by CLOB
  let prevDispatcher;
  if (proxyAgent) {
    try {
      const undici = require("undici");
      prevDispatcher = undici.getGlobalDispatcher?.() ?? null;
      undici.setGlobalDispatcher(proxyAgent);
    } catch (_) {}
  }

  const key = (process.env.POLYMARKET_PRIVATE_KEY || "").trim();
  const hasBuilderCreds =
    (process.env.POLY_BUILDER_API_KEY || "").trim() &&
    (process.env.POLY_BUILDER_SECRET || "").trim() &&
    (process.env.POLY_BUILDER_PASSPHRASE || "").trim();
  const usingSiteFunder = (process.env.POLYMARKET_FUNDER_ADDRESS || "").trim().startsWith("0x");
  // Only run gasless when using the relayer's proxy as funder. When POLYMARKET_FUNDER_ADDRESS is set,
  // the user funds the Polymarket site wallet (different address); no gasless needed.
  if (key && hasBuilderCreds && !usingSiteFunder && !gaslessApprovalDone) {
    const gasless = await ensureAllowanceGasless(key);
    if (gasless.ok) {
      gaslessApprovalDone = true;
      console.log("[polymarket] Gasless USDC.e approval done.");
      // Give chain/indexer a moment so CLOB sees the new allowance
      await new Promise((r) => setTimeout(r, 5000));
    } else if (gasless.message) {
      console.warn("[polymarket] Gasless approval failed or skipped:", gasless.message, "— Set POLYGON_RPC_URL (e.g. Alchemy) or approve USDC.e once on polymarket.com.");
    }
  }

  // Gasless only did the on-chain approval; the actual prediction is placed via CLOB order below.
  console.log("[polymarket] Placing CLOB order...", `$${sizeUsdClamped} (${confidence}% confidence)`);
  await new Promise((r) => setTimeout(r, 5000));
  try {
    const getClientWithRetry = () => withTimeout(getClient(), 60000, "CLOB client / API key timed out (60s)");
    const { client, Side, OrderType } = await withFetchRetry(getClientWithRetry, { retries: 2, delayMs: 2000 });

    let marketInfo;
    try {
      marketInfo = await client.getMarket(market.conditionId);
    } catch (e) {
      return { placed: false, message: `getMarket failed: ${e.message}.` };
    }

    const tickSize = String(marketInfo?.minimum_tick_size ?? "0.01");
    const negRisk = Boolean(marketInfo?.neg_risk);

    const sizeForOrder = Math.max(MIN_ORDER_USD, Math.min(capMax, sizeUsdClamped));

    function isOrderbookExpiredError(errOrResp) {
      const apiError = typeof (errOrResp?.response?.data?.error ?? errOrResp?.data?.error) === "string"
        ? (errOrResp.response?.data?.error ?? errOrResp.data?.error) : (errOrResp?.message || "");
      const errStr = (apiError || "").toLowerCase();
      return errStr.includes("orderbook") && (errStr.includes("does not exist") || errStr.includes("doesn't exist"));
    }

    let currentMarket = market;
    let currentTokenId = tokenId;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) {
        currentMarket = await findCryptoMarket15Min(assetKey, { excludeConditionId: market.conditionId });
        if (!currentMarket) {
          return { placed: false, message: `Market window closed (orderbook expired). No other current 15m window found for ${assetKey}.` };
        }
        currentTokenId = currentMarket.clobTokenIds[sideInfo.tokenIndex];
        if (!currentTokenId) return { placed: false, message: "Missing token ID for chosen side." };
        console.log("[polymarket] Retrying with current 15m window:", currentMarket.question || currentMarket.conditionId);
      }

      let marketInfo;
      try {
        marketInfo = await client.getMarket(currentMarket.conditionId);
      } catch (e) {
        if (attempt === 0 && isOrderbookExpiredError(e)) continue;
        return { placed: false, message: `getMarket failed: ${e.message}.` };
      }

      const tickSize = String(marketInfo?.minimum_tick_size ?? "0.01");
      const negRisk = Boolean(marketInfo?.neg_risk);

      // Use best ask (market price for BUY) so order fills at current market; fallback to 0.5 if unavailable
      let price = 0.5;
      try {
        const priceRes = await client.getPrice(currentTokenId, "BUY");
        const p = typeof priceRes === "number" ? priceRes : (priceRes?.price != null ? Number(priceRes.price) : NaN);
        if (Number.isFinite(p) && p > 0 && p <= 1) price = p;
      } catch (_) {}
      const tick = parseFloat(tickSize) || 0.01;
      price = Math.round(price / tick) * tick;
      price = Math.max(tick, Math.min(0.99, price));

      try {
        const response = await client.createAndPostOrder(
          {
            tokenID: currentTokenId,
            price,
            size: sizeForOrder,
            side: Side.BUY,
          },
          { tickSize, negRisk },
          OrderType.GTC
        );

        const orderId = response?.orderID ?? response?.orderId;
        if (!orderId) {
          const apiErr = response?.data?.error ?? response?.error ?? "";
          const errStr = typeof apiErr === "string" ? apiErr : "";
          const errLower = errStr.toLowerCase();
          if (errLower.includes("balance") || errLower.includes("allowance")) {
            const gaslessTip = hasBuilderCreds
              ? " With gasless, the CLOB uses your proxy wallet as funder — deposit USDC.e on polymarket.com (so the proxy has balance) then retry."
              : " Approve USDC.e once on polymarket.com or use gasless relayer.";
            return { placed: false, message: `Not enough USDC.e balance or allowance.${gaslessTip}` };
          }
          if (errLower.includes("orderbook") && (errLower.includes("does not exist") || errLower.includes("doesn't exist"))) {
            if (attempt === 0) continue;
            return { placed: false, message: `Market window closed (orderbook expired). No other current 15m window found.` };
          }
          if (errStr) return { placed: false, message: `Order rejected: ${errStr}.` };
          return {
            placed: false,
            message: `Order rejected (no order ID returned). Possible geoblock or API error — run from a non-blocked region. See https://docs.polymarket.com/developers/CLOB/geoblock`,
          };
        }

        return {
          placed: true,
          orderId,
          message: `Placed ${sideInfo.side} $${sizeForOrder} at ${price} (${confidence}% confidence) on "${currentMarket.question}" (order ${orderId}).`,
        };
      } catch (err) {
        const status = err.response?.status ?? err.status;
        const body = err.response?.data ?? err.data;
        const apiError = typeof body?.error === "string" ? body.error : err.message;
        if (status === 403 || (apiError && apiError.toLowerCase().includes("restricted"))) {
          return {
            placed: false,
            message: `Trading restricted in your region (geoblock). Run the bot from a non-blocked region. See https://docs.polymarket.com/developers/CLOB/geoblock`,
          };
        }
        if (status === 400 && (apiError || "").toLowerCase().includes("api key")) {
          return { placed: false, message: `Could not create API key. Check POLYMARKET_PRIVATE_KEY (Ethereum 0x... wallet).` };
        }
        const errText = (apiError || err.message || "").toLowerCase();
        if (status === 400 && errText.includes("orderbook") && (errText.includes("does not exist") || errText.includes("doesn't exist"))) {
          if (attempt === 0) continue;
          return { placed: false, message: `Market window closed (orderbook expired). No other current 15m window found.` };
        }
        if (status === 400 && (apiError || "").toLowerCase().includes("min size")) {
          return { placed: false, message: `Order size below Polymarket minimum ($${MIN_ORDER_USD}): ${apiError || err.message}.` };
        }
        if (status === 400 && ((apiError || "").toLowerCase().includes("balance") || (apiError || "").toLowerCase().includes("allowance"))) {
          return { placed: false, message: `Not enough USDC balance or allowance. Approve USDC.e once on polymarket.com (trade once) or use gasless relayer: https://docs.polymarket.com/trading/gasless` };
        }
        return { placed: false, message: `Order failed: ${apiError || err.message}.` };
      }
    }
    return { placed: false, message: `Market window closed (orderbook expired). No other current 15m window found for ${assetKey}.` };
  } finally {
    if (proxyAgent && prevDispatcher !== undefined) {
      try {
        require("undici").setGlobalDispatcher(prevDispatcher || new (require("undici").Agent)());
      } catch (_) {}
    }
  }
}

function isConfigured() {
  const raw = process.env.POLYMARKET_PRIVATE_KEY;
  const key = typeof raw === "string" ? raw.trim() : "";
  return Boolean(key && key.startsWith("0x"));
}

module.exports = {
  findCryptoMarket,
  findCryptoMarket15Min,
  getClient,
  placePrediction,
  isConfigured,
  analysisToSide,
  checkGeoblock,
  getFunderAddress,
  claimResolvedPositions,
};
