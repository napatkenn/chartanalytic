/**
 * Grant credits to a user by email.
 * Run: node scripts/grant-credits.js <email> [amount]
 * Example: node scripts/grant-credits.js knapatmanasilp@gmail.com 3
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

const email = process.argv[2] || "knapatmanasilp@gmail.com";
const amount = parseInt(process.argv[3] || "3", 10);

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error("User not found:", email);
    process.exit(1);
  }

  await prisma.creditBalance.upsert({
    where: { userId: user.id },
    create: { userId: user.id, credits: amount },
    update: { credits: { increment: amount } },
  });

  const balance = await prisma.creditBalance.findUnique({
    where: { userId: user.id },
  });
  console.log("Granted", amount, "credit(s) to", email);
  console.log("New balance:", balance.credits);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
