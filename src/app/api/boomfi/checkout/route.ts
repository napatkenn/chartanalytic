import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { createPayLink, getPayLinkUrl } from "@/lib/boomfi";

const CREDITS_PRODUCT = { name: "ChartAnalytic — 10 Credits", amount: "9.99", currency: "USD", credits: 10 };

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.BOOMFI_API_KEY) {
    return NextResponse.json(
      { error: "Crypto payments (BoomFi) are not configured" },
      { status: 503 }
    );
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? req.headers.get("origin") ?? "";
  const successUrl = `${baseUrl}/dashboard?success=1&source=boomfi`;

  try {
    const response = await createPayLink({
      name: CREDITS_PRODUCT.name,
      description: "10 chart analyses for ChartAnalytic",
      amount: CREDITS_PRODUCT.amount,
      currency: CREDITS_PRODUCT.currency,
      type: "OneTime",
      customerReference: session.user.id,
      metadata: {
        userId: session.user.id,
        credits: String(CREDITS_PRODUCT.credits),
      },
      successUrl,
    });

    const url = getPayLinkUrl(response);
    if (!url) {
      return NextResponse.json(
        { error: "Could not get payment link URL" },
        { status: 502 }
      );
    }
    return NextResponse.json({ url });
  } catch (e) {
    console.error("BoomFi checkout error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not create payment link" },
      { status: 500 }
    );
  }
}
