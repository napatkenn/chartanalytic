import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { ScrollingStrip } from "@/components/ScrollingStrip";
import { Disclaimer } from "@/components/Disclaimer";
import { PLANS, type PlanTier } from "@/lib/plans";

// Ensure root is always server-rendered so Vercel never serves static 404 for /
export const dynamic = "force-dynamic";

export default async function HomePage() {
  let session = null;
  try {
    session = await getServerSession(authOptions);
    if (session?.user?.id) redirect("/dashboard");
  } catch {
    // If DB/NextAuth fails (e.g. missing env on Vercel), still render landing so / never 404s/500s
  }

  return (
    <div className="min-h-screen bg-white">
      <AppHeader session={null} activePath="/" />

      <main className="flex flex-col">
        {/* Hero — BoomFi/dashboard style */}
        <section className="relative border-b border-gray-200 bg-gray-50 px-4 py-16 sm:py-24">
          <div className="container mx-auto max-w-4xl text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              AI chart analysis
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
              Trade with clarity.
              <br />
              <span className="text-gray-500">Not guesswork.</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600">
              Upload a chart with multi-timeframe support. Get market bias, support & resistance,
              entry, TP, SL, risk-reward, and concise reasoning — in seconds.
            </p>
            <div className="mt-10">
              <Link
                href="/register"
                className="inline-flex items-center rounded-full bg-emerald-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600"
              >
                Start free trial
              </Link>
            </div>
            <div className="mt-12 flex justify-center">
              <Image
                src="/images/hero-chart.svg"
                alt="Chart analysis"
                width={400}
                height={280}
                className="w-full max-w-sm opacity-90"
                priority
              />
            </div>
          </div>
        </section>

        {/* Moveable strip */}
        <ScrollingStrip />

        {/* Subscription tiers — BoomFi style, Start free trial → register */}
        <section className="border-b border-gray-200 bg-white px-4 py-16 sm:py-20">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">
              Choose your plan
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-gray-600">
              Start with a free trial, then subscribe with crypto (BoomFi).
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {(["starter", "active", "advanced"] as PlanTier[]).map((tier) => {
                const plan = PLANS[tier];
                return (
                  <div
                    key={tier}
                    className={`relative flex flex-col rounded-2xl border p-6 transition hover:shadow-lg ${
                      plan.popular
                        ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute right-4 top-4 rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-medium text-white">
                        Most popular
                      </span>
                    )}
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                      <span className="text-gray-500">/ {plan.periodLabel}</span>
                    </div>
                    <ul className="mt-4 space-y-2">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="text-emerald-500">✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/register"
                      className={`mt-6 block w-full rounded-xl py-3 text-center text-sm font-semibold transition ${
                        plan.popular
                          ? "bg-emerald-500 text-white hover:bg-emerald-600"
                          : "border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                      }`}
                    >
                      Start free trial
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-b border-gray-200 bg-gray-50 px-4 py-16">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">
              The only analysis tool you&apos;ll need
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-gray-600">
              Adapt your trading with AI-powered levels and reasoning with multi-timeframe support.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm transition hover:shadow-md">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <span className="text-xl">📊</span>
                </div>
                <h3 className="font-semibold text-gray-900">Bias & levels</h3>
                <p className="mt-2 text-sm text-gray-600">Market bias, support and resistance in one view.</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm transition hover:shadow-md">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <span className="text-xl">🎯</span>
                </div>
                <h3 className="font-semibold text-gray-900">Entry, TP, SL</h3>
                <p className="mt-2 text-sm text-gray-600">Clear entry, take profit and stop loss with risk:reward.</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm transition hover:shadow-md">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <span className="text-xl">⚡</span>
                </div>
                <h3 className="font-semibold text-gray-900">Seconds, not hours</h3>
                <p className="mt-2 text-sm text-gray-600">Upload a screenshot and get structured analysis instantly.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="bg-white py-12">
          <Disclaimer />
        </div>
      </main>
    </div>
  );
}
