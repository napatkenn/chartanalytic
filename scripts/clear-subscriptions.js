/**
 * Remove all subscription records from the database.
 * Run from project root: node scripts/clear-subscriptions.js
 * Or: cmd /c "cd /d c:\path\to\chartanalytic && node scripts/clear-subscriptions.js"
 */

const path = require("path");
const fs = require("fs");

// Load .env
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const value = match[2].trim().replace(/^["']|["']$/g, "");
        process.env[match[1].trim()] = value;
      }
    });
}

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.subscription.deleteMany({});
  console.log("Deleted", result.count, "subscription(s).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
