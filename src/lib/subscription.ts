import { prisma } from "./db";
import { PLANS, type PlanTier } from "./plans";

export interface ActiveSubscription {
  planTier: PlanTier;
  periodEnd: Date;
  uploadsPerDay: number;
}

export async function getActiveSubscription(userId: string): Promise<ActiveSubscription | null> {
  const sub = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  if (!sub || sub.status !== "active" || !sub.planTier || !sub.currentPeriodEnd) return null;
  const periodEnd = new Date(sub.currentPeriodEnd);
  if (periodEnd <= new Date()) return null;
  const plan = PLANS[sub.planTier as PlanTier];
  if (!plan) return null;
  return {
    planTier: sub.planTier as PlanTier,
    periodEnd,
    uploadsPerDay: plan.uploadsPerDay,
  };
}

/** Count analyses uploaded today (UTC date) for the user. */
export async function getTodayUploadCount(userId: string): Promise<number> {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  return prisma.chartAnalysis.count({
    where: {
      userId,
      createdAt: { gte: startOfToday },
    },
  });
}

export async function getRemainingUploadsToday(userId: string): Promise<{ remaining: number; limit: number } | null> {
  const sub = await getActiveSubscription(userId);
  if (!sub) return null;
  const used = await getTodayUploadCount(userId);
  return {
    remaining: Math.max(0, sub.uploadsPerDay - used),
    limit: sub.uploadsPerDay,
  };
}

/** Set or update active BoomFi subscription after payment. */
export async function setBoomFiSubscription(
  userId: string,
  planTier: PlanTier,
  periodDays: number,
  boomfiSubscriptionId?: string | null
): Promise<void> {
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + periodDays);
  const existing = await prisma.subscription.findFirst({ where: { userId } });
  const data = {
    status: "active" as const,
    planTier,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false,
    ...(boomfiSubscriptionId != null ? { boomfiSubscriptionId } : {}),
  };
  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.subscription.create({
      data: { userId, ...data },
    });
  }
}

/** Get the latest subscription record for a user (for management/cancel). */
export async function getSubscriptionRecord(userId: string) {
  return prisma.subscription.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

/** Update only the plan tier of the user's active subscription (e.g. after upgrade). Keeps currentPeriodEnd and boomfiSubscriptionId. */
export async function updateSubscriptionTier(userId: string, newTier: PlanTier): Promise<void> {
  const existing = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  if (!existing || existing.status !== "active") return;
  await prisma.subscription.update({
    where: { id: existing.id },
    data: { planTier: newTier },
  });
}

/** Mark subscription as canceled (after BoomFi cancel or webhook). */
export async function setSubscriptionCanceled(
  userId: string,
  options?: { atPeriodEnd?: boolean }
): Promise<void> {
  const existing = await prisma.subscription.findFirst({ where: { userId } });
  if (!existing) return;
  await prisma.subscription.update({
    where: { id: existing.id },
    data: options?.atPeriodEnd
      ? { cancelAtPeriodEnd: true }
      : { status: "canceled", cancelAtPeriodEnd: false },
  });
}
