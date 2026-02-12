import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateOtpCode, sendOtpEmail, OTP_EXPIRY_MS } from "@/lib/send-otp-email";

const GenerateSchema = z.object({
  email: z.string().email(),
  type: z.string().optional(),
  organization: z.string().optional(),
  subject: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, organization, subject } = GenerateSchema.parse(body);

    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await prisma.otpVerification.upsert({
      where: { email },
      create: { email, code, expiresAt },
      update: { code, expiresAt },
    });

    await sendOtpEmail({ to: email, code, organization, subject });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.errors.map((x) => x.message).join(", ") },
        { status: 400 }
      );
    }
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("[otp/generate]", err.message);
    if (err.message.includes("GMAIL_OTP")) {
      return NextResponse.json(
        { error: "Email is not configured. Set GMAIL_OTP_USER and GMAIL_OTP_APP_PASSWORD." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Could not send verification code." },
      { status: 500 }
    );
  }
}
