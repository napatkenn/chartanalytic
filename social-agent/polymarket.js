/**
 * Polymarket prediction integration: find crypto markets via Gamma API and place
 * orders via CLOB using chart analysis (marketBias + confidence).
 * Requires: POLYMARKET_PRIVATE_KEY (wallet with USDC.e on Polygon), optional
 * POLYMARKET_MIN_CONFIDENCE, POLYMARKET_MAX_SIZE_USD, POLYMARKET_MARKET_SLUGS.
 * Proxy (PROXY_URL) is used only for Polymarket API calls in this file, not for capture/OpenAI.
 */

const GAMMA_API = "https://gamma-api.polymarket.com";
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

/** Default slugs for "Up or Down - 15 min" (event slugs from polymarket.com/event/...). */
const ASSET_15M_SLUGS = {
  btc: "btc-updown-15m-1771670700",
  eth: "eth-updown-15m-1771670700",
  sol: "sol-updown-15m-1771670700",
  xrp: "xrp-updown-15m-1771670700",
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
  return {
    conditionId,
    question: m.question || event.title || "",
    clobTokenIds: parseClobTokenIds(ids),
    slug: event.slug || m.slug,
    endDateIso: m.endDateIso || m.end_date_iso || event.endDateIso || event.end_date_iso,
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

/**
 * Fetch a single market by slug (Gamma API: GET /markets/slug/{slug}).
 * @see https://docs.polymarket.com/api-reference/markets/get-market-by-slug
 * @param {string} slug - Market slug (e.g. btc-updown-15m-1771670700)
 * @returns {Promise<{ conditionId: string, question: string, clobTokenIds: string[], slug: string } | null>}
 */
async function fetchMarketBySlug(slug) {
  if (!slug || !slug.trim()) return null;
  const res = await pmFetch(
    `${GAMMA_API}/markets/slug/${encodeURIComponent(slug.trim())}`
  );
  if (!res.ok) return null;
  const m = await res.json();
  const conditionId = m.conditionId || m.condition_id;
  const ids = m.clobTokenIds || m.clob_token_ids;
  if (!conditionId || !ids) return null;
  const tokenIds = parseClobTokenIds(ids);
  if (tokenIds.length < 2) return null;
  const active = m.active !== false && m.closed !== true;
  if (!active) return null;
  return {
    conditionId,
    question: m.question || m.title || "",
    clobTokenIds: tokenIds,
    slug: m.slug || slug,
    endDateIso: m.endDateIso || m.end_date_iso,
  };
}

/**
 * Fetch event by slug and return first active market (for event URLs like polymarket.com/event/btc-updown-15m-1771670700).
 * Gamma API: GET /events?slug=... or /events/slug/...
 */
async function fetchEventBySlug(slug) {
  if (!slug || !slug.trim()) return null;
  const slugEnc = encodeURIComponent(slug.trim());
  const res = await pmFetch(`${GAMMA_API}/events?slug=${slugEnc}&limit=1`);
  if (!res.ok) return null;
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.events || (data ? [data] : []);
  const event = list[0];
  if (!event || !event.markets || event.markets.length === 0) return null;
  for (const m of event.markets) {
    const out = marketFromEventMarket(event, m);
    if (out) return out;
  }
  return null;
}

/** Parse POLYMARKET_MARKET_SLUGS env (e.g. "btc:btc-updown-15m,eth:eth-updown-15m" or "slug1,slug2" in btc,eth,sol,xrp order). */
function getSlugOverride(assetKey) {
  const raw = process.env.POLYMARKET_MARKET_SLUGS;
  if (!raw || !raw.trim()) return null;
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const order = ["btc", "eth", "sol", "xrp"];
  for (const p of parts) {
    if (p.includes(":")) {
      const [key, slug] = p.split(":").map((s) => s.trim());
      if (key === assetKey && slug) return slug;
    }
  }
  const idx = order.indexOf(assetKey);
  if (idx >= 0 && parts[idx]) return parts[idx];
  return null;
}

/** Return true if market end time is in the future (still open for trading). */
function isMarketEndInFuture(market) {
  const end = market.endDateIso;
  if (!end) return true;
  return new Date(end).getTime() > Date.now();
}

/**
 * Find an active 15-minute up/down market for the asset (preferred for our 15-min bot).
 * Prefers current/next 15m window (from event listing) so we don't use expired slugs.
 * 1) Event listing: active 15m events for this asset, pick market with nearest future end time.
 * 2) Optional POLYMARKET_MARKET_SLUGS: if set, try that slug first (for manual override).
 * 3) Fallback: try default ASSET_15M_SLUGS only if end time is still in the future.
 */
async function findCryptoMarket15Min(assetKey) {
  const prefix = ASSET_15M_SLUG_PREFIXES[assetKey];
  if (!prefix) return null;

  const now = Date.now();
  let best = null;
  let bestEnd = Infinity;

  // 1) Prefer event listing so we get the current/next window (orderbook still open)
  const res = await pmFetch(
    `${GAMMA_API}/events?active=true&closed=false&limit=100`
  );
  if (res.ok) {
    const events = await res.json();
    for (const event of events) {
      const slug = (event.slug || "").toLowerCase();
      if (!slug.includes("15m") || !slug.includes("updown")) continue;
      if (!slug.startsWith(prefix)) continue;
      const markets = event.markets || [];
      for (const m of markets) {
        const out = marketFromEventMarket(event, m);
        if (!out) continue;
        const endMs = out.endDateIso ? new Date(out.endDateIso).getTime() : 0;
        if (endMs > now && endMs < bestEnd) {
          bestEnd = endMs;
          best = out;
        }
      }
      if (best) break;
    }
  }

  if (best) return best;

  // 2) POLYMARKET_MARKET_SLUGS override (manual slug for current window)
  const slugOverride = getSlugOverride(assetKey);
  if (slugOverride) {
    const bySlug = await fetchMarketBySlug(slugOverride);
    if (bySlug && isMarketEndInFuture(bySlug)) return bySlug;
    const byEvent = await fetchEventBySlug(slugOverride);
    if (byEvent && isMarketEndInFuture(byEvent)) return byEvent;
  }

  // 3) Default slug only if its market end is still in the future
  const slugToTry = ASSET_15M_SLUGS[assetKey];
  if (slugToTry) {
    const bySlug = await fetchMarketBySlug(slugToTry);
    if (bySlug && isMarketEndInFuture(bySlug)) return bySlug;
    const byEvent = await fetchEventBySlug(slugToTry);
    if (byEvent && isMarketEndInFuture(byEvent)) return byEvent;
  }

  // 4) Public search for "Bitcoin 15 minute" etc.
  const q = `${ASSET_SEARCH_QUERIES[assetKey] || assetKey} 15 minute`;
  const searchRes = await pmFetch(
    `${GAMMA_API}/public-search?q=${encodeURIComponent(q)}&events_status=open&limit_per_type=10`
  );
  if (searchRes.ok) {
    const data = await searchRes.json();
    const searchEvents = data.events || [];
    for (const event of searchEvents) {
      const slug = (event.slug || "").toLowerCase();
      const title = (event.title || "").toLowerCase();
      if (!slug.includes("15m") && !title.includes("15 min")) continue;
      const markets = event.markets || [];
      for (const m of markets) {
        const out = marketFromEventMarket(event, m);
        if (!out) continue;
        const endMs = out.endDateIso ? new Date(out.endDateIso).getTime() : 0;
        if (endMs > now && endMs < bestEnd) {
          bestEnd = endMs;
          best = out;
        }
      }
      if (best) break;
    }
  }
  return best;
}

/**
 * Search Polymarket for active crypto markets. Prefers 15-minute up/down markets when available.
 * @param {string} assetKey - 'btc' | 'eth' | 'sol'
 * @returns {Promise<{ conditionId: string, question: string, clobTokenIds: string[], slug?: string } | null>}
 */
async function findCryptoMarket(assetKey) {
  // 1) Prefer 15-minute markets (align with our 15-min analysis schedule)
  const market15m = await findCryptoMarket15Min(assetKey);
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

  const client = new ClobClient(CLOB_HOST, CHAIN_ID, signer, apiCreds, 0, signer.address);
  return { client, Side, OrderType };
}

/**
 * Map chart analysis to Polymarket side and token.
 * - Bullish → Buy YES (first token). Bearish → Buy NO (second token). Range → skip.
 * - Optionally invert if market question is phrased as "below X" (then bearish = Yes).
 */
function analysisToSide(analysis, marketQuestion) {
  const bias = (analysis.marketBias || "range").toLowerCase();
  if (bias === "range") return null;

  const q = (marketQuestion || "").toLowerCase();
  const isInverted = q.includes("below") || q.includes("under") || q.includes("drop");

  if (bias === "bullish") return { side: isInverted ? "NO" : "YES", tokenIndex: isInverted ? 1 : 0 };
  if (bias === "bearish") return { side: isInverted ? "YES" : "NO", tokenIndex: isInverted ? 0 : 1 };
  return null;
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
    const rpc = (process.env.POLYGON_RPC_URL || "").trim() || "https://polygon-bor-rpc.publicnode.com";
    const wallet = createWalletClient({
      account,
      chain: polygon,
      transport: http(rpc),
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
  const minConfidence = Number(process.env.POLYMARKET_MIN_CONFIDENCE) || 65;
  const maxSizeUsd = Math.max(1, Number(process.env.POLYMARKET_MAX_SIZE_USD) || 1);

  const assetKey = schedule.polymarketAsset;
  if (!assetKey) {
    return { placed: false, message: `Schedule ${schedule.id} has no polymarketAsset; skip prediction.` };
  }

  const confidence = analysis.confidence != null ? Number(analysis.confidence) : 0;
  if (confidence < minConfidence) {
    return { placed: false, message: `Confidence ${confidence}% below min ${minConfidence}%; skip.` };
  }

  const sideInfo = analysisToSide(analysis, null);
  if (!sideInfo) {
    return { placed: false, message: "Market bias is range; no prediction." };
  }

  const market = await withFetchRetry(() => findCryptoMarket(assetKey), { retries: 2, delayMs: 2000 });
  if (!market) {
    return { placed: false, message: `No active Polymarket found for ${assetKey}.` };
  }

  const tokenId = market.clobTokenIds[sideInfo.tokenIndex];
  if (!tokenId) {
    return { placed: false, message: "Missing token ID for chosen side." };
  }

  if (dryRun) {
    return {
      placed: false,
      message: `[DRY-RUN] Would place ${sideInfo.side} $${maxSizeUsd} on "${market.question}" (confidence ${confidence}%).`,
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
  if (key && hasBuilderCreds && !gaslessApprovalDone) {
    const gasless = await ensureAllowanceGasless(key);
    if (gasless.ok) {
      gaslessApprovalDone = true;
      console.log("[polymarket] Gasless USDC.e approval done.");
    } else if (gasless.message) {
      console.warn("[polymarket] Gasless approval failed or skipped:", gasless.message, "— Set POLYGON_RPC_URL (e.g. Alchemy) or approve USDC.e once on polymarket.com.");
    }
  }

  console.log("[polymarket] Placing CLOB order...");
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

    const price = 0.5; // Mid price; adjust if you want to limit at better odds
    const MIN_ORDER_USD = 1; // Polymarket CLOB minimum for marketable BUY
    const size = Math.max(MIN_ORDER_USD, Math.min(maxSizeUsd, 100));

    try {
      const response = await client.createAndPostOrder(
        {
          tokenID: tokenId,
          price,
          size,
          side: Side.BUY, // We choose Yes or No by tokenId (first or second token)
        },
        { tickSize, negRisk },
        OrderType.GTC
      );

      const orderId = response?.orderID ?? response?.orderId;
      if (!orderId) {
        const apiErr = response?.data?.error ?? response?.error ?? "";
        const errStr = typeof apiErr === "string" ? apiErr : "";
        if (errStr.toLowerCase().includes("balance") || errStr.toLowerCase().includes("allowance")) {
          return { placed: false, message: `Not enough USDC balance or allowance. Approve USDC.e once on polymarket.com (trade once) or use gasless relayer: https://docs.polymarket.com/trading/gasless` };
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
        message: `Placed ${sideInfo.side} $${size} on "${market.question}" (order ${orderId}).`,
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
      if (status === 400 && (apiError || "").toLowerCase().includes("orderbook") && (apiError || "").toLowerCase().includes("does not exist")) {
        return { placed: false, message: `Market window closed (orderbook expired). Next run will use current 15m window.` };
      }
      if (status === 400 && (apiError || "").toLowerCase().includes("min size")) {
        return { placed: false, message: `Order size below Polymarket minimum ($1): ${apiError || err.message}.` };
      }
      if (status === 400 && ((apiError || "").toLowerCase().includes("balance") || (apiError || "").toLowerCase().includes("allowance"))) {
        return { placed: false, message: `Not enough USDC balance or allowance. Approve USDC.e once on polymarket.com (trade once) or use gasless relayer: https://docs.polymarket.com/trading/gasless` };
      }
      return { placed: false, message: `Order failed: ${apiError || err.message}.` };
    }
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
  fetchMarketBySlug,
  fetchEventBySlug,
  getClient,
  placePrediction,
  isConfigured,
  analysisToSide,
  checkGeoblock,
};
