"use client";

import { useState } from "react";
import type { PlanTier } from "@/lib/plans";
import { PLANS } from "@/lib/plans";
import { trackEvent } from "@/lib/gtag";

export function UpgradeButton({ tier }: { tier: PlanTier }) {
  const [loading, setLoading] = useState(false);
  const plan = PLANS[tier];

  async function handleClick() {
    trackEvent("begin_checkout", { tier, plan: tier });
    setLoading(true);
    try {
      const res = await fetch("/api/boomfi/subscription/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const text = await res.text();
      let data: { url?: string; success?: boolean; redirectUrl?: string; error?: string; hint?: string } = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { error: res.ok ? "Invalid response" : `Error ${res.status}` };
        }
      } else if (!res.ok) {
        data = { error: `Request failed (${res.status})` };
      }
      if (data.url) {
        trackEvent("boomfi_checkout_entered", { tier, plan: tier, destination: "boomfi" });
        window.location.href = data.url;
        return;
      }
      if (data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      const msg = data.hint ? `${data.error}\n\n${data.hint}` : (data.error ?? "Could not start upgrade.");
      alert(msg);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Network or server error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="w-full rounded-xl bg-emerald-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
    >
      {loading ? "Upgrading…" : `Upgrade to ${plan.name}`}
    </button>
  );
}
