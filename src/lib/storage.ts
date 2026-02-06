import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

export async function saveUpload(buffer: Buffer, mime: string): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : "png";
  const filename = `${randomUUID()}.${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);
  await writeFile(filepath, buffer);
  return `/api/uploads/${filename}`;
}

export function getUploadUrl(relativePath: string): string {
  if (process.env.STORAGE_BASE_URL) {
    return `${process.env.STORAGE_BASE_URL}${relativePath}`;
  }
  return relativePath;
}
