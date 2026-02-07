/**
 * Post chart + caption to X (Twitter) using the official API.
 * Free tier: create an app at https://developer.x.com and use API Key + Secret + Access Token.
 * One-time setup: get credentials from the app's "Keys and tokens" (generate Access Token for your account).
 * Env: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
 * @see https://developer.x.com/en/docs/twitter-api/v1/media/upload-media/api-reference/post-media-upload
 * @see https://developer.x.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function rfc3986(s) {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

function oauth1Sign(method, url, params, consumerSecret, tokenSecret) {
  const sorted = Object.entries(params).sort(([a], [b]) => (a < b ? -1 : 1));
  const paramStr = sorted.map(([k, v]) => `${rfc3986(k)}=${rfc3986(v)}`).join("&");
  const base = `${method}&${rfc3986(url)}&${rfc3986(paramStr)}`;
  const key = `${rfc3986(consumerSecret)}&${rfc3986(tokenSecret || "")}`;
  const sig = crypto.createHmac("sha1", key).update(base).digest("base64");
  return sig;
}

function getConfig() {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;
  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    throw new Error(
      "X API credentials missing. Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET (from developer.x.com app Keys and tokens)."
    );
  }
  return { apiKey, apiSecret, accessToken, accessTokenSecret };
}

/**
 * Upload image to X; returns media_id_string.
 */
async function uploadMedia(filePath) {
  const { apiKey, apiSecret, accessToken, accessTokenSecret } = getConfig();
  const url = "https://upload.twitter.com/1.1/media/upload.json";
  const buffer = fs.readFileSync(filePath);

  const oauth = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };
  oauth.oauth_signature = oauth1Sign("POST", url, oauth, apiSecret, accessTokenSecret);
  const authHeader =
    "OAuth " +
    Object.entries(oauth)
      .map(([k, v]) => `${rfc3986(k)}="${rfc3986(v)}"`)
      .join(", ");

  const form = new FormData();
  form.append("media", new Blob([buffer], { type: "image/png" }), path.basename(filePath) || "chart.png");

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: authHeader },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`X media upload failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.media_id_string;
}

/**
 * Post tweet with text and media (Bearer token for v2).
 * Free tier can use OAuth 1.0a for v2 with user context - we need to use the same credentials.
 * Actually v2 POST /2/tweets requires OAuth 2.0 user context or OAuth 1.0a. Let me check - for OAuth 1.0a we can call v2 with the user's access token. So we need to sign the v2 request with OAuth 1.0a. Twitter docs say for v2 you can use OAuth 2.0 Authorization Code with PKCE or OAuth 1.0a. So we'll use OAuth 1.0a for both upload and tweet.
 */
async function createTweet(text, mediaIdString) {
  const { apiKey, apiSecret, accessToken, accessTokenSecret } = getConfig();
  const url = "https://api.twitter.com/2/tweets";
  const tweetText = text.length > 280 ? text.slice(0, 277) + "..." : text;
  const body = JSON.stringify({
    text: tweetText,
    ...(mediaIdString ? { media: { media_ids: [mediaIdString] } } : {}),
  });

  const oauth = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };
  const params = { ...oauth };
  const baseUrl = "https://api.twitter.com/2/tweets";
  oauth.oauth_signature = oauth1Sign("POST", baseUrl, params, apiSecret, accessTokenSecret);
  const authHeader =
    "OAuth " +
    Object.entries(oauth)
      .map(([k, v]) => `${rfc3986(k)}="${rfc3986(v)}"`)
      .join(", ");

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`X create tweet failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function postChart(imagePath, caption) {
  const mediaId = await uploadMedia(imagePath);
  const result = await createTweet(caption, mediaId);
  return result;
}

function isConfigured() {
  return !!(
    process.env.X_API_KEY &&
    process.env.X_API_SECRET &&
    process.env.X_ACCESS_TOKEN &&
    process.env.X_ACCESS_TOKEN_SECRET
  );
}

module.exports = { uploadMedia, createTweet, postChart, getConfig, isConfigured };
