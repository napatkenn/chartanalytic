import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const SendOtpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).optional(),
});

const OTP_EXPIRY_MINUTES = 15;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name } = SendOtpSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.OTP_SERVICE_URL ?? "https://otp-service-beta.vercel.app";
    const res = await fetch(`${baseUrl}/api/otp/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        type: "numeric",
        organization: "ChartAnalytic",
        subject: "Verify your email",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[send-otp] OTP service error", res.status, errText);
      return NextResponse.json(
        { error: "Could not send verification code. Please try again." },
        { status: 502 }
      );
    }

    const passwordHash = await hash(password, 12);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.pendingRegistration.upsert({
      where: { email },
      create: { email, passwordHash, name: name ?? null, expiresAt },
      update: { passwordHash, name: name ?? null, expiresAt },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.errors.map((x) => x.message).join(", ") },
        { status: 400 }
      );
    }
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("[send-otp]", err.message, err.cause ?? "");
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
