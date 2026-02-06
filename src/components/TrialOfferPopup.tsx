"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function TrialOfferPopup() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/trial-offer")
      .then((res) => res.json())
      .then((data) => {
        setShow(!!data.show);
      })
      .finally(() => setChecking(false));
  }, []);

  async function handleActivate() {
    setLoading(true);
    try {
      const res = await fetch("/api/trial-offer/activate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Something went wrong");
        return;
      }
      setShow(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (checking || !show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setShow(false)}
        aria-hidden
      />
      <div
        className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
        role="dialog"
        aria-labelledby="trial-title"
        aria-modal="true"
      >
        <div className="text-center">
          <p className="text-4xl mb-2">🎉</p>
          <h2 id="trial-title" className="text-xl font-bold text-gray-900">
            Launch Offer - Free Trial
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You&apos;re eligible for a 1-day free trial on ChartAnalytic!
          </p>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-gray-700">
          <li className="flex items-center gap-2">
            <span className="text-emerald-500">✓</span>
            Free access for 1 day
          </li>
          <li className="flex items-center gap-2">
            <span className="text-emerald-500">✓</span>
            Up to 3 chart uploads
          </li>
          <li className="flex items-center gap-2">
            <span className="text-emerald-500">✓</span>
            No credit card required
          </li>
        </ul>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => setShow(false)}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Maybe later
          </button>
          <button
            type="button"
            onClick={handleActivate}
            disabled={loading}
            className="flex-1 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {loading ? "Activating…" : "Activate"}
          </button>
        </div>
      </div>
    </div>
  );
}
