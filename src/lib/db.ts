import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}

/** Lazy-initialized so Vercel build (no DATABASE_URL) doesn't fail when loading API routes. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return (createPrisma() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
