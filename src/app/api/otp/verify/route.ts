import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const VerifySchema = z.object({
  email: z.string().email(),
  otp: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, otp } = VerifySchema.parse(body);

    const row = await prisma.otpVerification.findUnique({
      where: { email },
    });

    if (!row || row.code !== otp) {
      return NextResponse.json(
        { message: "Invalid or expired code." },
        { status: 400 }
      );
    }

    if (row.expiresAt < new Date()) {
      await prisma.otpVerification.delete({ where: { email } }).catch(() => {});
      return NextResponse.json(
        { message: "Invalid or expired code." },
        { status: 400 }
      );
    }

    await prisma.otpVerification.delete({ where: { email } });

    return NextResponse.json({ success: true, message: "Verified." });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.errors.map((x) => x.message).join(", ") },
        { status: 400 }
      );
    }
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("[otp/verify]", err.message);
    return NextResponse.json(
      { error: "Verification failed." },
      { status: 500 }
    );
  }
}
