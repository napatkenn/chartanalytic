import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getSubscriptionRecord, setSubscriptionCanceled } from "@/lib/subscription";
import { cancelBoomFiSubscription } from "@/lib/boomfi";

/**
 * POST /api/boomfi/subscription/cancel
 * Cancel the current BoomFi subscription at period end.
 * User keeps access until currentPeriodEnd; then subscription is treated as ended.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const record = await getSubscriptionRecord(session.user.id);
  if (!record) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }
  if (record.status !== "active") {
    return NextResponse.json({ error: "Subscription is not active" }, { status: 400 });
  }

  try {
    if (record.boomfiSubscriptionId) {
      await cancelBoomFiSubscription(record.boomfiSubscriptionId);
    }
  } catch (e) {
    console.error("BoomFi cancel error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to cancel on BoomFi" },
      { status: 502 }
    );
  }

  await setSubscriptionCanceled(session.user.id, { atPeriodEnd: true });
  return NextResponse.json({ success: true });
}
