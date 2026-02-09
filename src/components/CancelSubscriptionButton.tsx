"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/gtag";

export function CancelSubscriptionButton() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function confirmCancel() {
    setLoading(true);
    try {
      const res = await fetch("/api/boomfi/subscription/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Failed to cancel");
        return;
      }
      trackEvent("cancel_subscription_click");
      setShowModal(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        disabled={loading}
        className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        Cancel subscription
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !loading && setShowModal(false)} aria-hidden />
          <div className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Cancel subscription?</h3>
            <p className="mt-2 text-sm text-gray-600">
              You will keep full access until the current period ends, then it will not renew.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                onClick={confirmCancel}
                disabled={loading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Cancelling…" : "Yes, cancel subscription"}
              </button>
              <button
                type="button"
                onClick={() => !loading && setShowModal(false)}
                disabled={loading}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Keep subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
