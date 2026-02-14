import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDistanceToNow } from "date-fns";
import { MARKET_BIAS_LABELS } from "@/lib/analysis-types";
import type { MarketBias } from "@/lib/analysis-types";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "History — ChartAnalytic",
  description: "View all your chart analyses.",
};

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const analyses = await prisma.chartAnalysis.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <header className="flex h-14 min-h-[3.5rem] items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 sm:px-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">History</p>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/dashboard"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">Analysis history</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">All your chart analyses, newest first.</p>

        <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          {analyses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-gray-500 dark:text-gray-400">
              <p className="text-sm">No analyses yet</p>
              <Link href="/analyze" className="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
                Upload your first chart
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {analyses.map((a) => {
                const symbolLabel = (a.symbol && a.symbol.trim()) ? a.symbol.trim() : "Chart";
                const timeframeLabel = a.timeframe ? ` (${a.timeframe})` : "";
                const title = `${symbolLabel}${timeframeLabel}`;
                const bias = a.marketBias as MarketBias;
                const biasClass =
                  bias === "bullish"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : bias === "bearish"
                      ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
                const hasOutcome = a.tradeOutcome === "win" || a.tradeOutcome === "lose";
                return (
                  <li key={a.id}>
                    <Link
                      href={`/analysis/${a.id}`}
                      className="flex flex-col gap-1 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {hasOutcome && (
                          <span
                            className={`rounded-lg border px-2 py-0.5 text-xs font-medium ${
                              a.tradeOutcome === "win"
                                ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : "border-red-500 bg-red-50 text-red-800 dark:border-red-600 dark:bg-red-900/40 dark:text-red-300"
                            }`}
                          >
                            {a.tradeOutcome === "win" ? "Won" : "Lost"}
                            {a.tradeAmount != null && (
                              <span className="ml-1 font-mono">
                                ({a.tradeAmount > 0 ? "+" : ""}{a.tradeAmount})
                              </span>
                            )}
                          </span>
                        )}
                        <span
                          className={`rounded-lg border px-2 py-0.5 text-xs font-medium ${biasClass}`}
                        >
                          {MARKET_BIAS_LABELS[bias] ?? a.marketBias}
                        </span>
                      </div>
                      <span className="shrink-0 text-gray-400 dark:text-gray-500">→</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
