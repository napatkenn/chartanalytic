import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getSubscriptionRecord, updateSubscriptionTier } from "@/lib/subscription";
import { updateBoomFiSubscriptionPlan } from "@/lib/boomfi";
import { getBoomFiPlanId, PLANS, isUpgrade } from "@/lib/plans";
import type { PlanTier } from "@/lib/plans";

/**
 * POST /api/boomfi/subscription/upgrade
 * Upgrade existing subscription to a higher tier. BoomFi subscription is updated to the new plan
 * effective immediately: the current billing period and all future billing periods are charged at
 * the new plan (no extra payment or action from the user). Local tier is updated right after so
 * the user can use the app at the new tier instantly.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const tier = (body.tier ?? "") as PlanTier;
  if (!["starter", "active", "advanced"].includes(tier)) {
    return NextResponse.json({ error: "Invalid plan tier" }, { status: 400 });
  }

  const record = await getSubscriptionRecord(session.user.id);
  if (!record || record.status !== "active") {
    return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
  }
  if (!record.boomfiSubscriptionId) {
    return NextResponse.json(
      { error: "Subscription cannot be upgraded (missing BoomFi link)" },
      { status: 400 }
    );
  }

  const currentTier = (record.planTier ?? "starter") as PlanTier;
  if (!isUpgrade(currentTier, tier)) {
    return NextResponse.json(
      { error: "Only upgrades are allowed. Cancel and resubscribe to switch to a lower tier." },
      { status: 400 }
    );
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? req.headers.get("origin") ?? "";

  const demoMode = process.env.ENABLE_DEMO_SUBSCRIPTION === "true";
  if (demoMode) {
    await updateSubscriptionTier(session.user.id, tier);
    return NextResponse.json({ success: true, redirectUrl: `${baseUrl}/subscribe?upgraded=1` });
  }

  const newPlanId = getBoomFiPlanId(tier);
  if (!newPlanId) {
    return NextResponse.json(
      {
        error: `Upgrade to ${tier} is not configured.`,
        hint: `Set BOOMFI_PLAN_ID_${tier.toUpperCase()} so the current and all future billing periods use the new plan.`,
      },
      { status: 503 }
    );
  }

  try {
    await updateBoomFiSubscriptionPlan(record.boomfiSubscriptionId, newPlanId);
  } catch (e) {
    console.error("BoomFi subscription plan update failed:", e);
    return NextResponse.json(
      {
        error: "Could not update your plan with the billing provider.",
        hint: "Ensure BoomFi subscription plan update is enabled (current and future billing periods will use the new plan). Try again or contact support.",
      },
      { status: 502 }
    );
  }

  // Grant new tier immediately so the user can use the app at the upgraded plan right away.
  await updateSubscriptionTier(session.user.id, tier);
  return NextResponse.json({ success: true, redirectUrl: `${baseUrl}/subscribe?upgraded=1` });
}
