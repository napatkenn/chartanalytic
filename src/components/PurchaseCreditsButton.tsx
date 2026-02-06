"use client";

import { useState } from "react";

export function PurchaseCreditsButton({
  showSubscribeCrypto = false,
}: {
  /** Set true when BOOMFI_PLAN_ID is configured (server-only). */
  showSubscribeCrypto?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handlePurchaseCredits() {
    setLoading(true);
    try {
      const res = await fetch("/api/boomfi/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? "Checkout unavailable");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribeCrypto() {
    setLoading(true);
    try {
      const res = await fetch("/api/boomfi/subscribe", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? "Subscription link not available. Add BOOMFI_PLAN_ID to enable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handlePurchaseCredits}
        disabled={loading}
        className="btn-secondary text-sm border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
      >
        {loading ? "Redirecting…" : "Buy credits (BoomFi)"}
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
