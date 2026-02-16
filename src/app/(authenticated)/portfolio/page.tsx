import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/subscription";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { PortfolioChart } from "@/components/PortfolioChart";
import type { PortfolioPoint } from "@/components/PortfolioChart";
import { DashboardHeaderActions } from "@/components/DashboardHeaderActions";

export const metadata: Metadata = {
  title: "Portfolio — ChartAnalytic",
  description: "Your portfolio value based on recorded wins and losses.",
};

export const dynamic = "force-dynamic";

function formatAmount(n: number): string {
  if (n === Math.floor(n)) return String(n);
  return n.toFixed(2);
}

export default async function PortfolioPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const subscription = await getActiveSubscription(session.user.id);
  const isLocked = !subscription;

  type Row = { id: string; createdAt: Date; tradeOutcome: string | null; tradeAmount: number | null };
  const outcomes = await prisma.$queryRaw<Row[]>`
    SELECT id, "createdAt", "tradeOutcome", "tradeAmount"
    FROM "ChartAnalysis"
    WHERE "userId" = ${session.user.id}
      AND "tradeOutcome" IN ('win', 'lose')
    ORDER BY "createdAt" ASC
  `;

  let cumulative = 0;
  const portfolioData: PortfolioPoint[] = outcomes.map((o) => {
    const outcome = o.tradeOutcome as "win" | "lose";
    const pnl =
      o.tradeAmount != null
        ? outcome === "win"
          ? o.tradeAmount
          : -Math.abs(o.tradeAmount)
        : outcome === "win"
          ? 1
          : -1;
    cumulative += pnl;
    return {
      date: new Date(o.createdAt).toISOString(),
      label: format(new Date(o.createdAt), "MMM d, yyyy"),
      pnl,
      cumulative,
    };
  });

  return (
    <>
      <header className="flex h-14 min-h-[3.5rem] items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 sm:px-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">Portfolio</p>
        <DashboardHeaderActions />
      </header>

      <div className={isLocked ? "relative" : undefined}>
        <main
          className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isLocked ? "pointer-events-none select-none blur-md" : ""}`}
        >
        <section className="px-4 py-6 sm:px-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">
            Wins &amp; losses
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Cumulative P&amp;L from recorded trade outcomes. Record win/loss and optional amount on your analyses.
          </p>
        </section>

        <section className="px-4 pb-6 sm:px-6">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Cumulative P&amp;L
            </h2>
            <div className="mt-4 min-h-[240px]">
              <PortfolioChart data={portfolioData} height={260} />
            </div>
          </div>
        </section>

        <section className="px-4 pb-8 sm:px-6">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 sm:px-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Trade history
              </h2>
            </div>
            {outcomes.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400 sm:px-6">
                No trade outcomes yet. Record win or loss (and optional amount) on your analyses to see them here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                      <th className="px-4 py-3 font-medium sm:px-6">Date</th>
                      <th className="px-4 py-3 font-medium sm:px-6 text-right">Amount</th>
                      <th className="px-4 py-3 font-medium sm:px-6">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {outcomes.map((o) => {
                      const amt =
                        o.tradeAmount != null
                          ? o.tradeOutcome === "lose"
                            ? -Math.abs(o.tradeAmount)
                            : Math.abs(o.tradeAmount)
                          : o.tradeOutcome === "win"
                            ? 1
                            : -1;
                      const isWin = o.tradeOutcome === "win";
                      return (
                        <tr key={o.id} className="text-gray-900 dark:text-gray-100">
                          <td className="px-4 py-3 sm:px-6 whitespace-nowrap">
                            {format(new Date(o.createdAt), "MMM d, yyyy")}
                          </td>
                          <td className="px-4 py-3 sm:px-6 text-right font-medium tabular-nums">
                            <span className={isWin ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                              {isWin ? "+" : ""}{formatAmount(amt)}
                            </span>
                          </td>
                          <td className="px-4 py-3 sm:px-6">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                isWin
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                              }`}
                            >
                              {isWin ? "Win" : "Loss"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

        {isLocked && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-black/60"
            aria-hidden={false}
          >
            <div className="mx-4 max-w-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-xl text-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Upgrade to continue
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Portfolio is available for Pro users. Upgrade your plan to unlock Portfolio PnL and full access.
              </p>
              <Link
                href="/subscribe"
                className="mt-4 inline-block rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                Upgrade plan
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
