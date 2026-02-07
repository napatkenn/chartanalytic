/**
 * Post chart + caption to Postiz (self-hosted or cloud).
 * Self-hosted: no postiz.com account. Set POSTIZ_API_URL to your instance and create an API key in Settings → API.
 * @see https://docs.postiz.com/public-api
 * Env (self-hosted): POSTIZ_API_URL, POSTIZ_API_KEY (from your instance Settings → API), POSTIZ_INTEGRATION_ID.
 */

const fs = require("fs");
const path = require("path");

const CLOUD_API_URL = "https://api.postiz.com/public/v1";

function getConfig() {
  const apiUrl = (process.env.POSTIZ_API_URL || CLOUD_API_URL).replace(/\/$/, "");
  const apiKey = process.env.POSTIZ_API_KEY;
  const integrationId = process.env.POSTIZ_INTEGRATION_ID;
  const isSelfHosted = process.env.POSTIZ_API_URL != null && process.env.POSTIZ_API_URL !== "";

  if (!apiKey) {
    if (isSelfHosted) {
      throw new Error(
        "POSTIZ_API_KEY is not set. Create an API key in your Postiz instance: Settings → API."
      );
    }
    throw new Error(
      "POSTIZ_API_KEY is not set. For self-hosted (no postiz.com): set POSTIZ_API_URL to your instance (e.g. https://your-postiz.example.com/public/v1) and create an API key in Settings → API."
    );
  }
  if (!integrationId) {
    throw new Error(
      "POSTIZ_INTEGRATION_ID is not set. In Postiz, open your connected channel (X, LinkedIn, etc.) and use its integration ID from the URL or API."
    );
  }
  return { apiKey, apiUrl, integrationId };
}

/**
 * Upload a file to Postiz. Returns { id, path } for use in createPost.
 */
async function uploadFile(filePath) {
  const { apiKey, apiUrl } = getConfig();
  const buffer = fs.readFileSync(filePath);
  const formData = new FormData();
  const blob = new Blob([buffer], { type: "image/png" });
  formData.append("file", blob, path.basename(filePath) || "chart.png");

  const res = await fetch(`${apiUrl}/upload`, {
    method: "POST",
    headers: { Authorization: apiKey },
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Postiz upload failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return { id: data.id, path: data.path };
}

/**
 * Create a post with content and image. type: "now" | "schedule" | "draft".
 * For "schedule", pass date as ISO string.
 */
async function createPost(content, imageIds, options = {}) {
  const { apiKey, apiUrl, integrationId } = getConfig();
  const { type = "now", date = new Date().toISOString(), settingsType = "x" } = options;

  const image = Array.isArray(imageIds) ? imageIds : [imageIds];
  const body = {
    type,
    date,
    shortLink: false,
    tags: [],
    posts: [
      {
        integration: { id: integrationId },
        value: [{ content, image }],
        settings: settingsType === "x" ? { __type: "x", who_can_reply_post: "everyone", community: "" } : { __type: settingsType },
      },
    ],
  };

  const res = await fetch(`${apiUrl}/posts`, {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Postiz create post failed: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * Upload image and post immediately with caption.
 */
async function postChart(imagePath, caption) {
  const uploaded = await uploadFile(imagePath);
  const result = await createPost(caption, [{ id: uploaded.id, path: uploaded.path }], { type: "now" });
  return result;
}

module.exports = { uploadFile, createPost, postChart, getConfig };
