import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { PortfolioChart, type PortfolioPoint } from "@/components/PortfolioChart";

export const metadata: Metadata = {
  title: "Portfolio — ChartAnalytic",
  description: "Your portfolio value based on recorded wins and losses.",
};

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const analyses = await prisma.chartAnalysis.findMany({
    where: {
      userId: session.user.id,
      tradeOutcome: { not: null },
      tradeAmount: { not: null },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, createdAt: true, tradeOutcome: true, tradeAmount: true },
  });

  let cumulative = 0;
  const points: PortfolioPoint[] =
    analyses.length === 0
      ? []
      : [{ date: "", label: "Start", cumulative: 0, pnl: 0 }];
  for (const a of analyses) {
    const amount = a.tradeAmount ?? 0;
    const pnl = a.tradeOutcome === "win" ? amount : -Math.abs(amount);
    cumulative += pnl;
    points.push({
      date: a.createdAt.toISOString(),
      label: format(new Date(a.createdAt), "MMM d"),
      cumulative,
      pnl,
    });
  }

  const totalPnl = cumulative;
  const wins = analyses.filter((a) => a.tradeOutcome === "win").length;
  const losses = analyses.filter((a) => a.tradeOutcome === "lose").length;
  const winRate = analyses.length > 0 ? Math.round((wins / analyses.length) * 100) : 0;

  return (
    <>
      <header className="flex h-14 min-h-[3.5rem] items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
        <p className="text-sm text-gray-500">Portfolio</p>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          ← Dashboard
        </Link>
      </header>

      <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Portfolio value</h1>
        <p className="mt-1 text-sm text-gray-500">
          Cumulative P&L from your recorded trade outcomes (win/loss + amount).
        </p>

        {/* Summary cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Total P&L</p>
            <p
              className={`text-2xl font-bold ${
                totalPnl >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {totalPnl >= 0 ? "+" : ""}
              {totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Trades recorded</p>
            <p className="text-2xl font-bold text-gray-900">{analyses.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Win rate</p>
            <p className="text-2xl font-bold text-gray-900">{winRate}%</p>
            <p className="mt-0.5 text-xs text-gray-500">
              {wins}W / {losses}L
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Portfolio curve
          </h2>
          <div className="mt-4">
            <PortfolioChart data={points} height={280} />
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Record &quot;Win&quot; or &quot;Lose&quot; and amount on your{" "}
          <Link href="/history" className="font-medium text-emerald-600 hover:text-emerald-700">
            analysis history
          </Link>{" "}
          to build this chart.
        </p>
      </main>
    </>
  );
}
