/**
 * One-time script: clear old chart image URLs that point to /api/uploads/...
 * Those files don't exist on Vercel (ephemeral disk). Clearing them stops 404s
 * and the UI shows "Chart image no longer available" for those analyses.
 *
 * Run: node scripts/clear-old-upload-urls.js
 * Requires: .env with DATABASE_URL
 */

const path = require("path");
const fs = require("fs");
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  content.split("\n").forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  });
}

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  const result = await prisma.chartAnalysis.updateMany({
    where: { imageUrl: { startsWith: "/api/uploads/" } },
    data: { imageUrl: "" },
  });

  console.log("Cleared old upload URLs for", result.count, "analyses.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
