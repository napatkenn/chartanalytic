import { NextResponse } from "next/server";

/**
 * Direct account creation is disabled. Registration requires email OTP verification.
 * Use POST /api/auth/register/send-otp then POST /api/auth/register/verify-otp.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Registration requires email verification. Use the signup form to receive a verification code.",
    },
    { status: 400 }
  );
}
