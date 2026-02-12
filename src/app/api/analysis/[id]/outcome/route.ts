import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: { outcome?: string; amount?: number };
  try {
    body = await _req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const outcome = body.outcome === "win" || body.outcome === "lose" ? body.outcome : undefined;
  const amount = typeof body.amount === "number" ? body.amount : body.amount == null ? undefined : Number(body.amount);
  if (amount != null && (Number.isNaN(amount) || !Number.isFinite(amount))) {
    return NextResponse.json({ error: "Amount must be a number" }, { status: 400 });
  }

  const analysis = await prisma.chartAnalysis.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  await prisma.chartAnalysis.update({
    where: { id },
    data: {
      ...(outcome != null && { tradeOutcome: outcome }),
      ...(amount !== undefined && { tradeAmount: amount }),
    },
  });

  return NextResponse.json({ ok: true });
}
