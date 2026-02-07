import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);
  const rows = await prisma.chartAnalysis.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      imageUrl: true,
      marketBias: true,
      support: true,
      resistance: true,
      entry: true,
      takeProfit: true,
      stopLoss: true,
      takeProfit2: true,
      stopLoss2: true,
      riskReward: true,
      confidence: true,
      reasoning: true,
      createdAt: true,
    },
  });
  const analyses = rows.map((a) => ({
    ...a,
    support: JSON.parse(a.support || "[]") as string[],
    resistance: JSON.parse(a.resistance || "[]") as string[],
  }));
  return NextResponse.json({ analyses });
}
