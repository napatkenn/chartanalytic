import { NextResponse } from "next/server";
import { addCredits } from "@/lib/credits";
import { setBoomFiSubscription } from "@/lib/subscription";
import { prisma } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import type { PlanTier } from "@/lib/plans";
import { verifyBoomFiSignature, isTimestampFresh } from "@/lib/boomfi-webhook";

const CREDITS_PER_PAYMENT = 10;

export async function POST(req: Request) {
  const publicKey = process.env.BOOMFI_WEBHOOK_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const timestamp = req.headers.get("x-boomfi-timestamp") ?? "";
  const signature = req.headers.get("x-boomfi-signature") ?? "";

  if (!isTimestampFresh(timestamp)) {
    return NextResponse.json({ error: "Stale timestamp" }, { status: 400 });
  }
  if (!verifyBoomFiSignature(rawBody, timestamp, signature, publicKey)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: {
    event?: string;
    status?: string;
    customer?: { reference?: string };
    metadata?: { userId?: string; credits?: string; planTier?: string };
    subscription_id?: string;
    subscription?: { id?: string };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload.event ?? "";
  const status = (payload.status ?? "").toLowerCase();

  // Subscription cancelled (by user or API)
  if (
    event === "Subscription.Cancelled" ||
    event === "subscription.cancelled" ||
    status === "cancelled" ||
    status === "canceled"
  ) {
    const subId = payload.subscription_id ?? payload.subscription?.id;
    if (subId) {
      await prisma.subscription.updateMany({
        where: { boomfiSubscriptionId: subId },
        data: { status: "canceled", cancelAtPeriodEnd: false },
      });
    }
    return NextResponse.json({ received: true });
  }

  const isPaymentEvent =
    event === "Payment.Updated" || event === "Payment.Created" || event === "payment.completed";
  const isSuccess =
    payload.status === "Completed" ||
    payload.status === "Paid" ||
    payload.status === "completed" ||
    payload.status === "paid";

  if (!isPaymentEvent || !isSuccess) {
    return NextResponse.json({ received: true });
  }

  const userId =
    payload.metadata?.userId ??
    payload.customer?.reference ??
    (payload as { customer_id?: string }).customer_id;
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ received: true });
  }

  const planTier = payload.metadata?.planTier as PlanTier | undefined;
  const boomfiSubId = payload.subscription_id ?? payload.subscription?.id ?? undefined;

  if (planTier && ["starter", "active", "advanced"].includes(planTier)) {
    const plan = PLANS[planTier];
    if (plan) {
      await setBoomFiSubscription(userId, planTier, plan.periodDays, boomfiSubId);
    }
    return NextResponse.json({ received: true });
  }

  const creditsToAdd = payload.metadata?.credits
    ? parseInt(payload.metadata.credits, 10)
    : CREDITS_PER_PAYMENT;
  if (creditsToAdd > 0) {
    await addCredits(userId, creditsToAdd);
  }

  return NextResponse.json({ received: true });
}
