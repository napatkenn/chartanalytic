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
 * Tries multipart first, then base64 (application/x-www-form-urlencoded) to avoid 403 from multipart/OAuth issues.
 */
async function uploadMedia(filePath) {
  const { apiKey, apiSecret, accessToken, accessTokenSecret } = getConfig();
  const url = "https://upload.twitter.com/1.1/media/upload.json";
  const buffer = fs.readFileSync(filePath);

  const baseOauth = () => ({
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  });

  // 1) Try multipart/form-data (media + media_category)
  const form = new FormData();
  form.append("media", new Blob([buffer], { type: "image/png" }), path.basename(filePath) || "chart.png");
  form.append("media_category", "tweet_image");

  const oauthMultipart = baseOauth();
  oauthMultipart.oauth_signature = oauth1Sign("POST", url, oauthMultipart, apiSecret, accessTokenSecret);

  const authHeaderMultipart =
    "OAuth " +
    Object.entries(oauthMultipart)
      .map(([k, v]) => `${rfc3986(k)}="${rfc3986(String(v))}"`)
      .join(", ");

  let res = await fetch(url, {
    method: "POST",
    headers: { Authorization: authHeaderMultipart },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    const errDetail = (res.status === 401 || res.status === 403) ? formatXErrorHint(res.status, text) : "";
    if (res.status === 403) {
      // 2) Fallback: base64 media_data with application/x-www-form-urlencoded (avoids multipart/OAuth quirks)
      const mediaData = buffer.toString("base64");
      const bodyParams = { media_data: mediaData, media_category: "tweet_image" };
      const signParams = { ...baseOauth(), ...bodyParams };
      const sig = oauth1Sign("POST", url, signParams, apiSecret, accessTokenSecret);
      const oauthForHeader = { ...baseOauth(), oauth_signature: sig };
      const authHeaderForm =
        "OAuth " +
        Object.entries(oauthForHeader)
          .map(([k, v]) => `${rfc3986(k)}="${rfc3986(String(v))}"`)
          .join(", ");
      const body = new URLSearchParams(bodyParams).toString();
      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: authHeaderForm,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
      if (!res.ok) {
        const text2 = await res.text();
        throw new Error(`X media upload failed: ${res.status} ${text2}${formatXErrorHint(res.status, text2)}`);
      }
    } else {
      throw new Error(`X media upload failed: ${res.status} ${text}${errDetail}`);
    }
  }

  const data = await res.json();
  return data.media_id_string;
}

function formatXErrorHint(status, responseText) {
  let hint = "";
  try {
    const j = JSON.parse(responseText);
    const msg = j.errors && j.errors[0] ? j.errors[0].message : "";
    if (status === 401) {
      hint = "\n401 hint: Check all four credentials (X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET). Regenerate Access Token in developer.x.com → Keys and tokens and use the new values.";
    } else if (status === 403) {
      hint = "\n403 hint: Set app to \"Read and write\" in developer.x.com → your app → Settings → User authentication settings, then regenerate the Access Token (Keys and tokens) and use the new token.";
    }
    if (msg) hint += ` API message: ${msg}`;
  } catch (_) {
    if (status === 401) hint = "\n401 hint: Check credentials and regenerate Access Token.";
    else if (status === 403) hint = "\n403 hint: Set app to Read and write and regenerate Access Token.";
  }
  return hint;
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
    const hint = (res.status === 401 || res.status === 403) ? formatXErrorHint(res.status, text) : "";
    throw new Error(`X create tweet failed: ${res.status} ${text}${hint}`);
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
