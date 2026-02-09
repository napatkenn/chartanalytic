"use client";

import { useState } from "react";
import type { PlanTier } from "@/lib/plans";
import { trackEvent } from "@/lib/gtag";

export function SubscribeButton({ tier, disabled }: { tier: PlanTier; disabled?: boolean }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    trackEvent("begin_checkout", { tier, plan: tier });
    setLoading(true);
    try {
      const res = await fetch("/api/boomfi/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const text = await res.text();
      let data: { url?: string; error?: string; hint?: string } = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { error: res.ok ? "Invalid response" : `Error ${res.status}` };
        }
      } else if (!res.ok) {
        data = { error: `Request failed (${res.status})` };
      }
      if (data.url) window.location.href = data.url;
      else {
        const msg = data.hint ? `${data.error}\n\n${data.hint}` : (data.error ?? "Could not start checkout.");
        alert(msg);
      }
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
      disabled={disabled || loading}
      className="btn-primary w-full py-3"
    >
      {loading ? "Redirecting…" : disabled ? "Current plan" : "Subscribe with crypto"}
    </button>
  );
}
