import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

/** MIME to file extension for uploads */
function getExt(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "png";
}

/**
 * Save upload to persistent storage. On Vercel (BLOB_READ_WRITE_TOKEN set),
 * uses Vercel Blob so files survive across serverless invocations. Otherwise
 * writes to local disk and returns /api/uploads/... for the route to serve.
 */
export async function saveUpload(buffer: Buffer, mime: string): Promise<string> {
  const ext = getExt(mime);
  const filename = `${randomUUID()}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`uploads/${filename}`, buffer, {
      access: "public",
      contentType: mime,
      addRandomSuffix: false,
    });
    return blob.url;
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filepath = path.join(UPLOAD_DIR, filename);
  await writeFile(filepath, buffer);
  return `/api/uploads/${filename}`;
}

/**
 * Resolve stored imageUrl for display. Use when rendering so that:
 * - Absolute URLs (e.g. from Vercel Blob) are used as-is.
 * - Relative /api/uploads/... can be overridden with STORAGE_BASE_URL (e.g. CDN).
 */
export function getUploadUrl(storedUrl: string): string {
  if (storedUrl.startsWith("http://") || storedUrl.startsWith("https://")) {
    return storedUrl;
  }
  if (process.env.STORAGE_BASE_URL) {
    const base = process.env.STORAGE_BASE_URL.replace(/\/$/, "");
    return `${base}${storedUrl.startsWith("/") ? "" : "/"}${storedUrl}`;
  }
  return storedUrl;
}
