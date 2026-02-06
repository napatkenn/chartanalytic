import { redirect } from "next/navigation";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActiveSubscription, getSubscriptionRecord } from "@/lib/subscription";
import { PLANS, type PlanTier } from "@/lib/plans";
import { SubscribeButton } from "@/components/SubscribeButton";
import { CancelSubscriptionButton } from "@/components/CancelSubscriptionButton";
import { Disclaimer } from "@/components/Disclaimer";

export default async function SubscribePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [subscription, record] = await Promise.all([
    getActiveSubscription(session.user.id),
    getSubscriptionRecord(session.user.id),
  ]);
  const canCancel = record?.status === "active";

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
        <p className="text-sm text-gray-500">Subscribe</p>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10 flex flex-col items-center">
          <div className="mb-6 w-64 opacity-90">
            <Image src="/images/plans.svg" alt="" width={400} height={160} className="w-full h-auto" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Choose your plan</h1>
          <p className="mt-2 text-center text-gray-500 max-w-xl">
            Subscribe with crypto (BoomFi). Full AI analysis and daily upload limits per plan.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {(["starter", "active", "advanced"] as PlanTier[]).map((tier) => {
            const plan = PLANS[tier];
            return (
              <div
                key={tier}
                className={`relative flex flex-col overflow-hidden rounded-xl border p-6 ${
                  plan.popular ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-gray-200 bg-white"
                }`}
              >
                {plan.popular && (
                  <div className="absolute right-4 top-4 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                    Most Popular
                  </div>
                )}
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
                  {plan.tier === "starter" && (
                    <p className="mt-1 text-xs text-gray-500">Short-term access for testing</p>
                  )}
                </div>
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500">/ {plan.periodLabel}</span>
                </div>
                <ul className="mb-6 space-y-3">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-emerald-500">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-4">
                  <SubscribeButton tier={tier} disabled={!!subscription} />
                </div>
              </div>
            );
          })}
        </div>

        {subscription && (
          <section className="mt-10 w-full max-w-2xl mx-auto rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-medium text-emerald-800">
              You have an active plan: <strong>{subscription.planTier}</strong> until{" "}
              {subscription.periodEnd.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}.
            </p>
            {record?.cancelAtPeriodEnd && (
              <p className="mt-2 text-sm text-amber-700">
                Your subscription will not renew after this period. You keep full access until then.
              </p>
            )}
            <p className="mt-2 text-sm text-emerald-700">
              To change plan: cancel this subscription (access until period end), then choose a new plan below. You can also cancel on BoomFi from your payment confirmation or customer portal.
            </p>
            {canCancel && !record?.cancelAtPeriodEnd && (
              <div className="mt-4">
                <CancelSubscriptionButton />
              </div>
            )}
            <div className="mt-5 pt-5 border-t border-emerald-200">
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
