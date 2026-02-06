import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addCredits } from "@/lib/credits";

const TRIAL_CREDITS = 3;

/** POST: activate launch offer — give 3 credits and mark trial as used. */
export async function POST() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { trialActivatedAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (user.trialActivatedAt) {
    return NextResponse.json({ error: "Trial already activated" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: { trialActivatedAt: new Date() },
    }),
  ]);
  await addCredits(session.user.id, TRIAL_CREDITS);

  return NextResponse.json({ success: true, credits: TRIAL_CREDITS });
}
