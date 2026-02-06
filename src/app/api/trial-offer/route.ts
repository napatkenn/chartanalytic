import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrCreateCredits } from "@/lib/credits";

/** GET: whether to show the launch trial popup (new user, not yet activated, no credits). */
export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ show: false });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { trialActivatedAt: true },
  });

  const credits = await getOrCreateCredits(session.user.id);
  const show = !!user && user.trialActivatedAt === null && credits === 0;
  return NextResponse.json({ show });
}
