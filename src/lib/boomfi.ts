/**
 * BoomFi API client for crypto payment links.
 * @see https://docs.boomfi.xyz/docs/pay-links
 * @see https://docs.boomfi.xyz/reference/create-payment-link
 */

const BOOMFI_BASE = process.env.BOOMFI_BASE_URL ?? "https://mapi.boomfi.xyz";

export type BoomFiPayLinkType = "OneTime" | "Recurring";

export interface CreatePayLinkParams {
  name: string;
  description?: string;
  amount: string; // e.g. "9.99"
  currency: string; // e.g. "USD"
  type: BoomFiPayLinkType;
  /** Customer reference sent in webhooks (e.g. userId for crediting) */
  customerReference?: string;
  /** Optional metadata (e.g. credits count, userId) */
  metadata?: Record<string, string>;
  /** Redirect URL after successful payment */
  successUrl?: string;
  /** Recurring: plan id if type is Recurring */
  planId?: string;
  /** Recurring interval: "month" | "year" */
  recurringInterval?: string;
  recurringIntervalCount?: number;
}

export interface BoomFiPayLinkResponse {
  id?: string;
  url?: string;
  link?: string;
  reference?: string;
  [key: string]: unknown;
}

export async function createPayLink(params: CreatePayLinkParams): Promise<BoomFiPayLinkResponse> {
  const apiKey = process.env.BOOMFI_API_KEY;
  if (!apiKey) throw new Error("BOOMFI_API_KEY is not set");

  const body: Record<string, unknown> = {
    name: params.name,
    amount: params.amount,
    currency: params.currency,
    type: params.type,
  };
  if (params.description) body.description = params.description;
  if (params.customerReference) body.customer_ident = params.customerReference;
  if (params.metadata) body.metadata = params.metadata;
  if (params.successUrl) body.redirect_url = params.successUrl;
  if (params.type === "Recurring" && params.planId) body.plan_id = params.planId;
  if (params.recurringInterval) body.recurring_interval = params.recurringInterval;
  if (params.recurringIntervalCount != null)
    body.recurring_interval_count = params.recurringIntervalCount;

  const res = await fetch(`${BOOMFI_BASE}/v1/paylinks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as BoomFiPayLinkResponse & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `BoomFi API error: ${res.status}`);
  }

  return data;
}

/** Build checkout URL from pay link response (BoomFi returns link or url) */
export function getPayLinkUrl(response: BoomFiPayLinkResponse): string | null {
  const url = response.url ?? response.link;
  if (typeof url === "string") return url;
  if (response.id && BOOMFI_BASE.includes("mapi"))
    return `https://pay.boomfi.xyz/${response.id}`;
  return null;
}

/**
 * Cancel a BoomFi subscription by ID.
 * @see https://docs.boomfi.xyz/reference/cancel-subscription
 */
export async function cancelBoomFiSubscription(boomfiSubscriptionId: string): Promise<void> {
  const apiKey = process.env.BOOMFI_API_KEY;
  if (!apiKey) throw new Error("BOOMFI_API_KEY is not set");

  const res = await fetch(`${BOOMFI_BASE}/v1/subscriptions/${encodeURIComponent(boomfiSubscriptionId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `BoomFi cancel failed: ${res.status}`);
  }
}

/**
 * Convert a BoomFi pay link to lite checkout URL with pre-filled name and email
 * so the customer doesn't have to enter them. See: https://docs.boomfi.xyz/docs/creating-pay-links
 */
export function getBoomFiLiteCheckoutUrl(
  payLinkUrl: string,
  customer: { email: string | null; name?: string | null }
): string {
  const u = payLinkUrl.trim();
  const match = u.match(/^https:\/\/pay\.boomfi\.xyz\/(?:lite\/)?(.+?)(?:\?|$)/);
  if (!match) return u;
  const pathId = match[1];
  const params = new URLSearchParams();
  if (customer.email) params.set("email", customer.email);
  params.set("name", customer.name?.trim() || customer.email || "Customer");
  return `https://pay.boomfi.xyz/lite/${pathId}?${params.toString()}`;
}
