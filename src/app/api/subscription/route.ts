import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getActiveSubscription, getRemainingUploadsToday } from "@/lib/subscription";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscription = await getActiveSubscription(session.user.id);
  const remaining = await getRemainingUploadsToday(session.user.id);

  return NextResponse.json({
    active: !!subscription,
    planTier: subscription?.planTier ?? null,
    periodEnd: subscription?.periodEnd?.toISOString() ?? null,
    uploadsPerDay: subscription?.uploadsPerDay ?? 0,
    remainingToday: remaining?.remaining ?? 0,
    dailyLimit: remaining?.limit ?? 0,
  });
}
