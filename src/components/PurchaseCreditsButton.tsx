"use client";

import { useState } from "react";

type PaymentMethod = "stripe" | "boomfi";

export function PurchaseCreditsButton({
  showSubscribeCrypto = false,
}: {
  /** Set true when BOOMFI_PLAN_ID is configured (server-only). */
  showSubscribeCrypto?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<PaymentMethod | null>(null);

  async function handleClick(paymentMethod: PaymentMethod) {
    setMethod(paymentMethod);
    setLoading(true);
    try {
      const endpoint =
        paymentMethod === "boomfi" ? "/api/boomfi/checkout" : "/api/stripe/checkout";
      const body =
        paymentMethod === "stripe"
          ? JSON.stringify({ mode: "credits", quantity: 10 })
          : undefined;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        ...(body ? { body } : {}),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? "Checkout unavailable");
    } finally {
      setLoading(false);
      setMethod(null);
    }
  }

  async function handleSubscribeCrypto() {
    setMethod("boomfi");
    setLoading(true);
    try {
      const res = await fetch("/api/boomfi/subscribe", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? "Subscription link not available. Add BOOMFI_PLAN_ID to enable.");
    } finally {
      setLoading(false);
      setMethod(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => handleClick("stripe")}
        disabled={loading}
        className="btn-secondary text-sm"
      >
        {loading && method === "stripe" ? "Redirecting…" : "Card (Stripe)"}
      </button>
      <button
        type="button"
        onClick={() => handleClick("boomfi")}
        disabled={loading}
        className="btn-secondary text-sm border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
      >
        {loading && method === "boomfi" ? "Redirecting…" : "Crypto (BoomFi)"}
      </button>
      {showSubscribeCrypto && (
        <button
          type="button"
          onClick={handleSubscribeCrypto}
          disabled={loading}
          className="btn-secondary text-sm border-violet-500/50 text-violet-400 hover:bg-violet-500/10"
        >
          {loading ? "Redirecting…" : "Subscribe (Crypto)"}
        </button>
      )}
    </div>
  );
}
