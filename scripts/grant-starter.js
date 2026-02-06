/**
 * One-time script: grant starter subscription to a user by email (for testing).
 * Run: node scripts/grant-starter.js
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

const EMAIL = "knapatmanasilp@gmail.com";
const PLAN_TIER = "starter";
const PERIOD_DAYS = 7;

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    console.error("User not found:", EMAIL);
    process.exit(1);
  }

  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + PERIOD_DAYS);

  const existing = await prisma.subscription.findFirst({ where: { userId: user.id } });
  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: { status: "active", planTier: PLAN_TIER, currentPeriodEnd: periodEnd },
    });
    console.log("Updated existing subscription to starter until", periodEnd.toISOString().slice(0, 10));
  } else {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        status: "active",
        planTier: PLAN_TIER,
        currentPeriodEnd: periodEnd,
      },
    });
    console.log("Granted starter subscription until", periodEnd.toISOString().slice(0, 10));
  }
  console.log("Done. User:", EMAIL);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
