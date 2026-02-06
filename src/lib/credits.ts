import { prisma } from "./db";

const FREE_TIER_CREDITS = 3;
const CREDITS_PER_ANALYSIS = 1;

export async function getOrCreateCredits(userId: string): Promise<number> {
  const balance = await prisma.creditBalance.upsert({
    where: { userId },
    create: { userId, credits: 0 },
    update: { updatedAt: new Date() },
  });
  return balance.credits;
}

export async function consumeCredit(userId: string): Promise<boolean> {
  const balance = await prisma.creditBalance.findUnique({
    where: { userId },
  });
  if (!balance || balance.credits < CREDITS_PER_ANALYSIS) return false;
  await prisma.creditBalance.update({
    where: { userId },
    data: { credits: { decrement: CREDITS_PER_ANALYSIS } },
  });
  return true;
}

export async function addCredits(userId: string, amount: number): Promise<void> {
  await prisma.creditBalance.upsert({
    where: { userId },
    create: { userId, credits: amount },
    update: { credits: { increment: amount } },
  });
}

export { CREDITS_PER_ANALYSIS, FREE_TIER_CREDITS };
