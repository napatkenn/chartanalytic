import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const VerifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(1, "Verification code is required"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, otp } = VerifyOtpSchema.parse(body);

    const baseUrl = process.env.OTP_SERVICE_URL ?? "https://otp-service-beta.vercel.app";
    const bypassOtp = baseUrl.toLowerCase() === "skip" || baseUrl === "";

    if (!bypassOtp) {
      let res: Response;
      try {
        res = await fetch(`${baseUrl}/api/otp/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp }),
        });
      } catch (fetchErr) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        console.error("[verify-otp] OTP service unreachable", msg);
        return NextResponse.json(
          { error: "Verification service is unreachable. Try again later." },
          { status: 502 }
        );
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          typeof data.message === "string"
            ? data.message
            : "Invalid or expired code.";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    const pending = await prisma.pendingRegistration.findUnique({
      where: { email },
    });

    if (!pending) {
      return NextResponse.json(
        { error: "Request expired. Please start again." },
        { status: 400 }
      );
    }

    if (pending.expiresAt < new Date()) {
      await prisma.pendingRegistration.delete({ where: { email } }).catch(() => {});
      return NextResponse.json(
        { error: "Request expired. Please start again." },
        { status: 400 }
      );
    }

    await prisma.user.create({
      data: {
        email: pending.email,
        passwordHash: pending.passwordHash,
        name: pending.name,
      },
    });

    await prisma.pendingRegistration.delete({ where: { email } });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: e.errors.map((x) => x.message).join(", ") },
        { status: 400 }
      );
    }
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("[verify-otp]", err.message, err.cause ?? "");
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
