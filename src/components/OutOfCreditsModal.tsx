"use client";

import { PLANS, type PlanTier } from "@/lib/plans";
import { SubscribeButton } from "@/components/SubscribeButton";

export function OutOfCreditsModal({
  show,
}: {
  show: boolean;
}) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="out-of-credits-title"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="p-6 sm:p-8">
          <div className="text-center mb-8">
            <h2 id="out-of-credits-title" className="text-2xl font-bold text-gray-900 sm:text-3xl">
              You&apos;ve used all your free credits
            </h2>
            <p className="mt-2 text-gray-600">
              Choose a plan below to continue analyzing charts with AI.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {(["starter", "active", "advanced"] as PlanTier[]).map((tier) => {
              const plan = PLANS[tier];
              return (
                <div
                  key={tier}
                  className={`relative flex flex-col rounded-xl border p-5 ${
                    plan.popular
                      ? "border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/30"
                      : "border-gray-200 bg-gray-50/50"
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-medium text-white">
                      Most popular
                    </span>
                  )}
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500 text-sm">/ {plan.periodLabel}</span>
                  </div>
                  <ul className="mt-4 space-y-2 flex-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="text-emerald-500 shrink-0">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5">
                    <SubscribeButton tier={tier} disabled={false} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
