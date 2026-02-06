import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe || !process.env.STRIPE_PRICE_ID_CREDITS) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const mode = (body.mode as string) || "credits"; // "credits" | "subscription"
  const quantity = Math.min(Math.max(Number(body.quantity) || 10, 1), 100);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { creditBalance: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    const existing = await prisma.subscription.findFirst({
      where: { userId: user.id },
      select: { stripeCustomerId: true },
    });
    let customerId = existing?.stripeCustomerId ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.subscription.create({
        data: {
          userId: user.id,
          stripeCustomerId: customerId,
          status: "none",
        },
      }).catch(() => {
        // race: another request may have created it
      });
    }

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: "payment",
      success_url: `${process.env.NEXTAUTH_URL ?? req.headers.get("origin")}/dashboard?success=1`,
      cancel_url: `${process.env.NEXTAUTH_URL ?? req.headers.get("origin")}/dashboard?canceled=1`,
      metadata: { userId: user.id, mode },
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID_CREDITS,
          quantity,
        },
      ],
    };

    const stripeSession = await stripe.checkout.sessions.create(sessionConfig);
    return NextResponse.json({ url: stripeSession.url });
  } catch (e) {
    console.error("Stripe checkout error:", e);
    return NextResponse.json(
      { error: "Could not create checkout session" },
      { status: 500 }
    );
  }
}
