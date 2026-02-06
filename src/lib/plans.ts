export const PLAN_TIERS = ["starter", "active", "advanced"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export interface PlanInfo {
  tier: PlanTier;
  name: string;
  price: string;
  priceAmount: number;
  periodDays: number;
  periodLabel: string;
  uploadsPerDay: number;
  features: string[];
  popular?: boolean;
}

export const PLANS: Record<PlanTier, PlanInfo> = {
  starter: {
    tier: "starter",
    name: "Starter",
    price: "$2.99",
    priceAmount: 2.99,
    periodDays: 7,
    periodLabel: "7 Days",
    uploadsPerDay: 10,
    features: [
      "AI analysis (full output)",
      "Up to 10 uploads per day",
      "7-day access",
    ],
  },
  active: {
    tier: "active",
    name: "Active Traders",
    price: "$9.99",
    priceAmount: 9.99,
    periodDays: 30,
    periodLabel: "30 Days",
    uploadsPerDay: 20,
    features: [
      "AI analysis (full output)",
      "Up to 20 uploads per day",
      "30-day access",
    ],
    popular: true,
  },
  advanced: {
    tier: "advanced",
    name: "Advanced Traders",
    price: "$29.99",
    priceAmount: 29.99,
    periodDays: 30,
    periodLabel: "30 Days",
    uploadsPerDay: 50,
    features: [
      "AI analysis (full output)",
      "High usage limits",
      "30-day access",
      "Priority support",
    ],
  },
};

export function getBoomFiPlanId(tier: PlanTier): string | null {
  const key = `BOOMFI_PLAN_ID_${tier.toUpperCase()}` as "BOOMFI_PLAN_ID_STARTER" | "BOOMFI_PLAN_ID_ACTIVE" | "BOOMFI_PLAN_ID_ADVANCED";
  return process.env[key] ?? null;
}

/** Full pay link URL from .env (e.g. from BoomFi dashboard). Use this when you have existing links. */
export function getBoomFiPayLinkUrl(tier: PlanTier): string | null {
  const key = `BOOMFI_PAYLINK_${tier.toUpperCase()}` as "BOOMFI_PAYLINK_STARTER" | "BOOMFI_PAYLINK_ACTIVE" | "BOOMFI_PAYLINK_ADVANCED";
  const url = process.env[key]?.trim();
  return url && url.startsWith("http") ? url : null;
}

export function isSubscriptionConfigured(): boolean {
  return PLAN_TIERS.some((t) => getBoomFiPlanId(t) || getBoomFiPayLinkUrl(t));
}
