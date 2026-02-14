import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActiveSubscription, getSubscriptionRecord } from "@/lib/subscription";
import { PLANS, PLAN_TIERS, TIER_ORDER, isUpgrade, type PlanTier } from "@/lib/plans";
import { SubscribeButton } from "@/components/SubscribeButton";
import { UpgradeButton } from "@/components/UpgradeButton";
import { CancelSubscriptionButton } from "@/components/CancelSubscriptionButton";
import { Disclaimer } from "@/components/Disclaimer";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Subscribe — ChartAnalytic",
  description: "Choose your ChartAnalytic plan. Subscribe with crypto (BoomFi) for AI chart analysis and daily upload limits.",
};

export default async function SubscribePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [subscription, record] = await Promise.all([
    getActiveSubscription(session.user.id),
    getSubscriptionRecord(session.user.id),
  ]);
  const canCancel = record?.status === "active";

  // When subscribed: show only current plan and higher-tier plans (hide lower-tier cards).
  const currentTier = subscription?.planTier as PlanTier | undefined;
  const tiersToShow: PlanTier[] = currentTier
    ? (PLAN_TIERS.filter((t) => TIER_ORDER[t] >= TIER_ORDER[currentTier]) as PlanTier[])
    : ([...PLAN_TIERS] as PlanTier[]);

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">Subscribe</p>
        <ThemeToggle />
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10 flex flex-col items-center">
          <div className="mb-6 w-64 opacity-90">
            <Image src="/images/plans.svg" alt="" width={400} height={160} className="w-full h-auto" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 sm:text-4xl">Choose your plan</h1>
          <p className="mt-2 text-center text-gray-500 dark:text-gray-400 max-w-xl">
            Subscribe with crypto (BoomFi). Full AI analysis and daily upload limits per plan.
          </p>
        </div>

        <div className={`grid gap-6 ${tiersToShow.length === 1 ? "max-w-md mx-auto" : tiersToShow.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
          {tiersToShow.map((tier) => {
            const plan = PLANS[tier];
            const isCurrentPlan = currentTier === tier;
            const canUpgrade = currentTier && isUpgrade(currentTier, tier);
            return (
              <div
                key={tier}
                className={`relative flex flex-col overflow-hidden rounded-xl border p-6 ${
                  plan.popular ? "border-emerald-500 ring-2 ring-emerald-500/30 dark:bg-emerald-900/20" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                }`}
              >
                {plan.popular && (
                  <div className="absolute right-4 top-4 rounded-full bg-emerald-100 dark:bg-emerald-800/50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                    Most Popular
                  </div>
                )}
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{plan.name}</h2>
                  {plan.tier === "starter" && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Short-term access for testing</p>
                  )}
                </div>
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">{plan.price}</span>
                  <span className="text-gray-500 dark:text-gray-400">/ {plan.periodLabel}</span>
                </div>
                <ul className="mb-6 space-y-3">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="text-emerald-500">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-4">
                  {!subscription && <SubscribeButton tier={tier} disabled={false} />}
                  {subscription && isCurrentPlan && (
                    <button type="button" disabled className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                      Current plan
                    </button>
                  )}
                  {subscription && canUpgrade && <UpgradeButton tier={tier} />}
                </div>
              </div>
            );
          })}
        </div>

        {subscription && (
          <section className="mt-10 w-full max-w-2xl mx-auto rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 p-5">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
              You have an active plan: <strong>{subscription.planTier}</strong> until{" "}
              {subscription.periodEnd.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}.
            </p>
            {record?.cancelAtPeriodEnd && (
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                Your subscription will not renew after this period. You keep full access until then.
              </p>
            )}
            <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
              Use the buttons above to upgrade to a higher plan. The current billing period and all future periods will be charged at the new plan — no payment or action required now. You can use the app at the new tier instantly. To downgrade: cancel this subscription (access until period end), then choose a new plan. You can also cancel on BoomFi from your payment confirmation or customer portal.
            </p>
            {canCancel && !record?.cancelAtPeriodEnd && (
              <div className="mt-4">
                <CancelSubscriptionButton />
              </div>
            )}
            <div className="mt-5 pt-5 border-t border-emerald-200 dark:border-emerald-800">
              <Disclaimer />
            </div>
          </section>
        )}

        {!subscription && (
          <div className="mt-12">
            <Disclaimer />
          </div>
        )}
      </main>
    </>
  );
}
