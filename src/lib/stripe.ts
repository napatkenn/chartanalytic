import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

/** Lazy-initialized so Vercel build (no STRIPE_SECRET_KEY) doesn't fail when loading API routes. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeInstance) stripeInstance = new Stripe(key);
  return stripeInstance;
}
