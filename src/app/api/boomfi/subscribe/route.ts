import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { createPayLink, getPayLinkUrl, getBoomFiLiteCheckoutUrl } from "@/lib/boomfi";
import { setBoomFiSubscription } from "@/lib/subscription";
import { getBoomFiPlanId, getBoomFiPayLinkUrl, PLANS } from "@/lib/plans";
import type { PlanTier } from "@/lib/plans";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const tier = (body.tier ?? "active") as PlanTier;
  if (!["starter", "active", "advanced"].includes(tier)) {
    return NextResponse.json({ error: "Invalid plan tier" }, { status: 400 });
  }

  const apiKey = process.env.BOOMFI_API_KEY;
  const payLinkUrl = getBoomFiPayLinkUrl(tier);
  const planId = getBoomFiPlanId(tier);
  const demoMode = process.env.ENABLE_DEMO_SUBSCRIPTION === "true";

  // Option 1: Use existing pay link URL from .env (no API call)
  if (payLinkUrl) {
    const url = getBoomFiLiteCheckoutUrl(payLinkUrl, {
      email: session.user.email ?? null,
      name: session.user.name ?? null,
    });
    return NextResponse.json({ url });
  }

  if (!apiKey && !demoMode) {
    return NextResponse.json(
      {
        error: "Crypto subscriptions are not configured.",
        code: "BOOMFI_NOT_CONFIGURED",
        hint: "Add BOOMFI_API_KEY to your .env, OR set BOOMFI_PAYLINK_STARTER, BOOMFI_PAYLINK_ACTIVE, BOOMFI_PAYLINK_ADVANCED to your existing BoomFi pay link URLs.",
      },
      { status: 503 }
    );
  }

  // Demo mode: activate subscription locally without BoomFi (for testing when plan IDs are not set)
  if (!planId) {
    if (demoMode) {
      try {
        const plan = PLANS[tier];
        await setBoomFiSubscription(session.user.id, tier, plan.periodDays);
        const baseUrl = process.env.NEXTAUTH_URL ?? req.headers.get("origin") ?? "";
        return NextResponse.json({ url: `${baseUrl}/dashboard?success=1&demo=1` });
      } catch (e) {
        console.error("Demo subscription error:", e);
        return NextResponse.json(
          { error: "Could not activate demo subscription.", hint: "Check server logs or database." },
          { status: 500 }
        );
      }
    }
    return NextResponse.json(
      {
        error: `Plan "${tier}" is not configured.`,
        code: "PLAN_NOT_CONFIGURED",
        hint: `Add BOOMFI_PAYLINK_${tier.toUpperCase()} with your BoomFi pay link URL, or BOOMFI_PLAN_ID_${tier.toUpperCase()}, or set ENABLE_DEMO_SUBSCRIPTION=true.`,
      },
      { status: 503 }
    );
  }

  const plan = PLANS[tier];
  const baseUrl = process.env.NEXTAUTH_URL ?? req.headers.get("origin") ?? "";
  const successUrl = `${baseUrl}/dashboard?success=1&source=boomfi`;

  try {
    const response = await createPayLink({
      name: `ChartAnalytic — ${plan.name}`,
      description: plan.features.join(" · "),
      amount: String(plan.priceAmount),
      currency: "USD",
      type: "Recurring",
      planId,
      customerReference: session.user.id,
      metadata: {
        userId: session.user.id,
        planTier: tier,
      },
      successUrl,
    });

    let url = getPayLinkUrl(response);
    if (!url) {
      return NextResponse.json(
        { error: "Could not get payment link" },
        { status: 502 }
      );
    }
    url = getBoomFiLiteCheckoutUrl(url, {
      email: session.user.email ?? null,
      name: session.user.name ?? null,
    });
    return NextResponse.json({ url });
  } catch (e) {
    console.error("BoomFi subscribe error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not create subscription link" },
      { status: 500 }
    );
  }
}
