import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActiveSubscription, getRemainingUploadsToday } from "@/lib/subscription";
import { getOrCreateCredits } from "@/lib/credits";
import { prisma } from "@/lib/db";
import { formatDistanceToNow } from "date-fns";
import { MARKET_BIAS_LABELS } from "@/lib/analysis-types";
import { Disclaimer } from "@/components/Disclaimer";

export const dynamic = "force-dynamic";

function CardIcon({ icon }: { icon: "upload" | "chart" | "chat" | "wallet" }) {
  const path =
    icon === "upload"
      ? "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      : icon === "chart"
        ? "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        : icon === "chat"
          ? "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m.375 0a.375.375 0 11-.75 0M8.25 12H7.5m.375 0a.375.375 0 11-.75 0M7.5 12h-.375m.375 0a.375.375 0 11-.75 0M6.375 12H5.25m.375 0a.375.375 0 11-.75 0M5.25 12H4.5m.375 0a.375.375 0 11-.75 0"
          : "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5";
  return (
    <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [subscription, remainingToday, credits, analyses] = await Promise.all([
    getActiveSubscription(session.user.id),
    getRemainingUploadsToday(session.user.id),
    getOrCreateCredits(session.user.id),
    prisma.chartAnalysis.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const displayName = session.user.name || session.user.email || "User";
  const totalUploads = analyses.length;
  const todayCreditsLabel = subscription
    ? `${remainingToday?.remaining ?? 0} / ${remainingToday?.limit ?? subscription.uploadsPerDay}`
    : `${credits}`;

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
        <p className="text-sm text-gray-500">Home</p>
        <Link
          href="/analyze"
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
        >
          + Create
        </Link>
      </header>

      <main className="min-h-screen bg-gray-50">
        {/* Welcome banner */}
        <section className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-8 text-white">
          <h1 className="text-2xl font-bold">Welcome back, {displayName}</h1>
          <p className="mt-1 text-emerald-100">
            Ready to analyze your charts with AI-powered insights?
          </p>
        </section>

        {/* Key metrics - 4 cards */}
        <section className="px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <CardIcon icon="upload" />
              <div>
                <p className="text-sm font-medium text-gray-500">Total Uploads</p>
                <p className="text-2xl font-bold text-gray-900">{totalUploads}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <CardIcon icon="chart" />
              <div>
                <p className="text-sm font-medium text-gray-500">Charts Analyzed</p>
                <p className="text-2xl font-bold text-gray-900">{totalUploads}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <CardIcon icon="chat" />
              <div>
                <p className="text-sm font-medium text-gray-500">AI Responses</p>
                <p className="text-2xl font-bold text-gray-900">{totalUploads}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <CardIcon icon="wallet" />
              <div>
                <p className="text-sm font-medium text-gray-500">Today Credits Left</p>
                <p className="text-2xl font-bold text-gray-900">{todayCreditsLabel}</p>
              </div>
            </div>
          </div>
        </section>

        {!subscription && credits === 0 && (
          <div className="mx-6 mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-medium text-amber-800">No credits left. Get more or subscribe to analyze charts.</p>
            <Link href="/subscribe" className="mt-3 inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600">
              View plans & subscribe
            </Link>
          </div>
        )}

        {subscription && remainingToday?.remaining === 0 && (
          <div className="mx-6 mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-medium text-emerald-800">You&apos;ve used all your daily uploads. Upgrade your plan for more.</p>
            <Link href="/subscribe" className="mt-3 inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600">
              Upgrade plan
            </Link>
          </div>
        )}

        {/* Two main panels */}
        <section className="grid gap-6 px-6 pb-6 lg:grid-cols-2">
          {/* AI Analysis Summary - vertical bar chart, same light theme as page */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <CardIcon icon="chart" />
              <h2 className="text-lg font-semibold text-gray-900">AI Analysis Summary</h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">Summary of your uploaded chart actions</p>

            {/* Vertical bar chart: analyses per trading pair or Unknown */}
            {analyses.length > 0 ? (() => {
              const bySymbol = analyses.reduce<Record<string, number>>((acc, a) => {
                const key = (a.symbol && a.symbol.trim()) ? a.symbol.trim() : "Unknown";
                acc[key] = (acc[key] ?? 0) + 1;
                return acc;
              }, {});
              const entries = Object.entries(bySymbol).sort((a, b) => b[1] - a[1]);
              const maxCount = Math.max(...entries.map(([, c]) => c), 1);
              const yTicks = Array.from({ length: maxCount + 1 }, (_, i) => i);
              const chartHeight = 180;
              return (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                  <div className="flex gap-2" style={{ minHeight: chartHeight }}>
                    {/* Y-axis (actual counts: 0, 1, 2, ...) + grid */}
                    <div className="flex shrink-0 flex-col justify-between pr-2 text-right">
                      {yTicks.slice().reverse().map((t) => (
                        <span key={t} className="text-xs text-gray-500">{t}</span>
                      ))}
                    </div>
                    {/* Grid lines + bars */}
                    <div className="relative flex-1">
                      {/* Horizontal dashed grid lines */}
                      <div className="absolute inset-0 flex flex-col justify-between" aria-hidden>
                        {yTicks.slice(1).map((_, i) => (
                          <div
                            key={i}
                            className="border-t border-dashed border-gray-200"
                            style={{ flex: 1 }}
                          />
                        ))}
                      </div>
                      {/* Bars row: height by actual count so 1 upload = bar to 1 */}
                      <div className="relative flex h-full items-end justify-around gap-2 pt-1 pb-8">
                        {entries.map(([symbol, count]) => {
                          const barHeightPx = maxCount > 0 ? (count / maxCount) * (chartHeight - 48) : 0;
                          const height = count > 0 ? Math.max(barHeightPx, 4) : 0;
                          return (
                            <div key={symbol} className="flex flex-1 flex-col items-center gap-2">
                              <div
                                className="relative flex w-full min-w-0 flex-1 flex-col justify-end"
                                style={{ minHeight: chartHeight - 48 }}
                              >
                                <div
                                  className="w-full rounded-t transition-all bg-emerald-500"
                                  style={{ height }}
                                />
                              </div>
                              <span className="max-w-full truncate text-center text-xs text-gray-600" title={symbol}>
                                {symbol}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-gray-500">No chart data yet</p>
                <Link href="/analyze" className="mt-2 text-sm font-medium text-emerald-600 hover:text-emerald-700">
                  Upload a chart to get started
                </Link>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              </div>
              <Link href="#recent" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
                View All History
              </Link>
            </div>
            <p className="mt-1 text-sm text-gray-500">Your latest uploads and analyses</p>
            <div id="recent" className="mt-4 max-h-[280px] overflow-y-auto rounded-xl border border-gray-200 bg-gray-50/30">
              {analyses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                  <p className="text-sm">No activity yet</p>
                  <Link href="/analyze" className="mt-2 text-sm font-medium text-emerald-600 hover:text-emerald-700">
                    Upload your first chart
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {analyses.slice(0, 8).map((a) => {
                    const symbolLabel = (a.symbol && a.symbol.trim()) ? a.symbol.trim() : "Unknown";
                    const timeframeLabel = a.timeframe ? ` (${a.timeframe})` : "";
                    const title = `AI Analysis Complete - ${symbolLabel}${timeframeLabel}`;
                    return (
                      <li key={a.id}>
                        <Link href={`/analysis/${a.id}`} className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-gray-50">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900">{title}</p>
                            <p className="mt-0.5 text-xs text-gray-500">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</p>
                          </div>
                          <span className="shrink-0 text-gray-400">→</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="px-6 pb-8">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <p className="mt-1 text-sm text-gray-500">Common tasks you might want to perform</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Link
              href="/analyze"
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                <CardIcon icon="upload" />
              </div>
              <span className="font-medium text-gray-900">Upload Chart</span>
            </Link>
            <Link
              href="/subscribe"
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                <CardIcon icon="chat" />
              </div>
              <span className="font-medium text-gray-900">Plans & Support</span>
            </Link>
            <Link
              href="#recent"
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-medium text-gray-900">View History</span>
            </Link>
          </div>
        </section>

        {/* Footer disclaimer */}
        <footer className="border-t border-gray-200 bg-white px-6 py-4">
          <Disclaimer />
        </footer>
      </main>
    </>
  );
}
