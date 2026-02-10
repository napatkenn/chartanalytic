import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/Logo";
import { AppHeader } from "@/components/AppHeader";
import { ScrollingStrip } from "@/components/ScrollingStrip";
import { StartTrialLink } from "@/components/StartTrialLink";
import { Disclaimer } from "@/components/Disclaimer";
import { PLANS, type PlanTier } from "@/lib/plans";

// Landing is static; logged-in users are redirected to /dashboard in middleware.
export default function HomePage() {
  return (
    <div className="min-h-screen bg-white safe-area-inset-bottom">
      <AppHeader session={null} activePath="/" />

      <main className="flex flex-col">
        {/* Hero — BoomFi/dashboard style */}
        <section className="relative border-b border-gray-200 bg-gray-50 px-4 py-12 sm:py-24">
          <div className="container mx-auto max-w-4xl text-center">
            <div className="mb-4 flex justify-center sm:mb-6">
              <div className="flex items-center gap-3">
                <Logo size={40} />
                <span className="text-2xl font-bold tracking-tight text-gray-900">{"Chart"}<span className="text-emerald-500">A</span>{"nalytic"}</span>
              </div>
            </div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 sm:mb-4 sm:text-sm">
              AI chart analysis
            </p>
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
              Upload any chart.
              <br />
              <span className="text-gray-500">
                Get bias, entry, TP & SL in under 10 seconds.
              </span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-gray-600 sm:mt-6 sm:text-lg">
              Upload a chart with multi-timeframe support. Get market bias, support & resistance,
              entry, TP, SL, risk-reward, and concise reasoning — in seconds.
            </p>
            <div className="mt-8 sm:mt-10">
              <StartTrialLink
                href="/register"
                source="hero"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-emerald-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 active:bg-emerald-700"
              >
                Start free trial
              </StartTrialLink>
              <p className="mt-3 text-center text-xs text-gray-500 sm:text-sm">
                ✓ No card required • ✓ 3 free analyses • ✓ Cancel anytime
              </p>
            </div>
            <p className="mt-10 text-center text-sm font-medium text-gray-500 sm:mt-12">
              See exactly what AI shows
            </p>
            <div className="mt-4 flex justify-center">
              <Image
                src="/images/ai-analysis-preview.png"
                alt="AI analysis result showing key levels, entry, take profit, stop loss and reasoning"
                width={560}
                height={420}
                className="w-full max-w-lg rounded-xl border border-gray-200 shadow-lg"
                sizes="(max-width: 640px) 100vw, 560px"
              />
            </div>
          </div>
        </section>

        {/* Moveable strip */}
        <ScrollingStrip />

        {/* How It Works */}
        <section id="how-it-works" className="border-b border-gray-200 bg-white px-4 py-12 sm:py-20 scroll-mt-20">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-center text-xl font-bold text-gray-900 sm:text-3xl">
              How It Works
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-gray-600 sm:text-base">
              Get AI-powered chart analysis in just 4 simple steps
            </p>
            <div className="mt-10 grid gap-8 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative flex flex-col items-center rounded-2xl border border-gray-200 bg-gray-50/50 p-6 text-center transition hover:border-orange-200 hover:bg-orange-50/30 hover:shadow-md">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <span className="absolute right-4 top-4 text-2xl font-bold tabular-nums text-orange-500/40">01</span>
                <h3 className="font-semibold text-gray-900">Signup</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Get started with Email and access smart chart insights in just a few clicks.
                </p>
              </div>
              <div className="relative flex flex-col items-center rounded-2xl border border-gray-200 bg-gray-50/50 p-6 text-center transition hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-md">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <span className="absolute right-4 top-4 text-2xl font-bold tabular-nums text-blue-500/40">02</span>
                <h3 className="font-semibold text-gray-900">Upload Your Chart</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Upload any candlestick chart image from MetaTrader, TradingView, or take a screenshot of your trading platform.
                </p>
              </div>
              <div className="relative flex flex-col items-center rounded-2xl border border-gray-200 bg-gray-50/50 p-6 text-center transition hover:border-purple-200 hover:bg-purple-50/30 hover:shadow-md">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <span className="absolute right-4 top-4 text-2xl font-bold tabular-nums text-purple-500/40">03</span>
                <h3 className="font-semibold text-gray-900">AI Analysis</h3>
                <p className="mt-2 text-sm text-gray-600">
                  The AI analyzes price structure, trend, liquidity zones, and momentum — the same things professional traders look for.
                </p>
              </div>
              <div className="relative flex flex-col items-center rounded-2xl border border-gray-200 bg-gray-50/50 p-6 text-center transition hover:border-emerald-200 hover:bg-emerald-50/30 hover:shadow-md">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="absolute right-4 top-4 text-2xl font-bold tabular-nums text-emerald-500/40">04</span>
                <h3 className="font-semibold text-gray-900">Get Detailed Results</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Receive comprehensive analysis including trend direction, support/resistance levels, and potential trading opportunities.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features — Powerful AI */}
        <section id="features" className="border-b border-gray-200 bg-gray-50 px-4 py-12 sm:py-16 scroll-mt-20">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-center text-xl font-bold text-gray-900 sm:text-3xl">
              Powerful AI Features
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-gray-600 sm:text-base">
              The AI evaluates market structure, trend, key levels, and momentum
              to help traders structure higher-quality trade ideas.
            </p>
            <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm transition hover:shadow-md">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="font-semibold text-gray-900">Beginner-Friendly Setup</h3>
                <p className="mt-2 text-sm text-gray-600">Just upload your chart screenshot and let our AI suggest your next move.</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm transition hover:shadow-md">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                </div>
                <h3 className="font-semibold text-gray-900">Universal Chart Upload</h3>
                <p className="mt-2 text-sm text-gray-600">Upload candlestick charts from MetaTrader, TradingView, or any trading platform screenshot.</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm transition hover:shadow-md">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                </div>
                <h3 className="font-semibold text-gray-900">Instant Price Action Analysis</h3>
                <p className="mt-2 text-sm text-gray-600">Get immediate insights on trend direction, momentum, and key price levels.</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm transition hover:shadow-md">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <h3 className="font-semibold text-gray-900">Support & Resistance Levels</h3>
                <p className="mt-2 text-sm text-gray-600">Identify critical support and resistance zones with AI precision.</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm transition hover:shadow-md">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
                </div>
                <h3 className="font-semibold text-gray-900">Multi-Market Support</h3>
                <p className="mt-2 text-sm text-gray-600">Works across Forex, Commodities, Stocks, and any financial instrument.</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm transition hover:shadow-md">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="font-semibold text-gray-900">Any Timeframe</h3>
                <p className="mt-2 text-sm text-gray-600">Analyze charts from any timeframe - scalping to swing trading.</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm transition hover:shadow-md">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="font-semibold text-gray-900">Lightning Fast</h3>
                <p className="mt-2 text-sm text-gray-600">Powered by AI for instant analysis results.</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm transition hover:shadow-md">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="font-semibold text-gray-900">Instant Trade Insights</h3>
                <p className="mt-2 text-sm text-gray-600">Get clear trading suggestions including potential entry, stop-loss, and take-profit zones.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Subscription tiers — BoomFi style, Start free trial → register */}
        <section id="pricing" className="border-b border-gray-200 bg-white px-4 py-12 sm:py-20 scroll-mt-20">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-center text-xl font-bold text-gray-900 sm:text-3xl">
              Choose your plan
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-gray-600 sm:text-base">
              Start with a free trial, then subscribe with crypto (BoomFi).
            </p>
            <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-3 sm:gap-6">
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
                    <StartTrialLink
                      href="/register"
                      source="pricing"
                      className={`mt-6 flex min-h-[48px] w-full items-center justify-center rounded-xl py-3 text-center text-sm font-semibold transition ${
                        plan.popular
                          ? "bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700"
                          : "border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100"
                      }`}
                    >
                      Start free trial
                    </StartTrialLink>
                    <p className="mt-3 text-center text-xs text-gray-500">
                      ✓ No card required • ✓ 3 free analyses • ✓ Cancel anytime
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Who Uses Chart Analyst */}
        <section className="border-b border-gray-200 bg-gray-50 px-4 py-12 sm:py-20">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-center text-xl font-bold text-gray-900 sm:text-3xl">
              Who Uses Chart Analyst?
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-gray-600 sm:text-base">
              From individual traders to large institutions, our AI-powered analysis helps traders of all levels make better decisions.
            </p>
            <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Retail Traders</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Individual traders looking to improve their chart analysis skills and make better trading decisions.
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Technical Analysts</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Professional analysts who need quick, accurate chart analysis for multiple markets and timeframes.
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Fund Managers</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Portfolio managers and fund operators seeking data-driven insights for investment decisions.
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Prop Traders</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Proprietary traders who need consistent, reliable analysis to meet performance targets.
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-1 4h1" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Institutions</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Banks, hedge funds, and financial institutions requiring scalable chart analysis solutions.
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Trading Teams</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Collaborative trading groups and signal providers looking for consistent analysis methodology.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Ready to Transform CTA */}
        <section className="border-b border-gray-200 bg-gray-50 px-4 py-16 sm:py-24">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Get Your First AI Chart Analysis in 10 Seconds
            </h2>
            <p className="mt-4 text-base text-gray-600 sm:text-lg">
              Join thousands of traders who trust Chart Analyst for accurate, AI-powered chart analysis. Start your free trial today.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
              <div className="flex flex-col items-center">
                <StartTrialLink
                  href="/register"
                  source="cta"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-emerald-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 active:bg-emerald-700"
                >
                  Start Free Trial
                </StartTrialLink>
              </div>
              <Link
                href="/#pricing"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border-2 border-emerald-500 bg-white px-8 py-3.5 text-base font-semibold text-emerald-600 transition hover:bg-emerald-50 active:bg-emerald-100"
              >
                View Pricing Plans
              </Link>
            </div>
          </div>
        </section>

        <div className="bg-white py-12 safe-area-inset-bottom">
          <Disclaimer />
        </div>
      </main>
    </div>
  );
}
