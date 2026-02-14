"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanTier } from "@/lib/plans";
import { PLANS } from "@/lib/plans";
import { trackEvent } from "@/lib/gtag";

export function UpgradeButton({ tier }: { tier: PlanTier }) {
  const plan = PLANS[tier];
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function openConfirm() {
    setShowConfirm(true);
  }

  async function confirmUpgrade() {
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
        setShowConfirm(false);
        setShowSuccess(true);
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

  function dismissSuccess() {
    setShowSuccess(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={openConfirm}
        disabled={loading}
        className="w-full rounded-xl bg-emerald-500 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
      >
        Upgrade to {plan.name}
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !loading && setShowConfirm(false)} aria-hidden />
          <div
            className="relative w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrade-confirm-title"
          >
            <h3 id="upgrade-confirm-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Upgrade to {plan.name}
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Your current billing period and all future periods will be charged at the new plan. You can use the app at the new tier immediately.
            </p>
            <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-gray-900 dark:text-gray-100">{plan.name}</span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{plan.price}</span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">/ {plan.periodLabel}</span>
              <ul className="mt-3 space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-emerald-500">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => !loading && setShowConfirm(false)}
                disabled={loading}
                className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmUpgrade}
                disabled={loading}
                className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {loading ? "Upgrading…" : "Upgrade plan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={dismissSuccess} aria-hidden />
          <div
            className="relative w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-xl text-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrade-success-title"
          >
            <p className="text-4xl mb-3">✓</p>
            <h3 id="upgrade-success-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">
              New plan activated
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              You&apos;re now on <strong>{plan.name}</strong>. Your new limits are in effect.
            </p>
            <button
              type="button"
              onClick={dismissSuccess}
              className="mt-6 w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
