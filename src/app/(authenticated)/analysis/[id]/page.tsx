import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUploadUrl } from "@/lib/storage";
import { formatDistanceToNow } from "date-fns";
import { MARKET_BIAS_LABELS } from "@/lib/analysis-types";
import { ChartImage } from "@/components/ChartImage";
import { Disclaimer } from "@/components/Disclaimer";
import type { MarketBias } from "@/lib/analysis-types";

export default async function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) notFound();

  const { id } = await params;
  const analysis = await prisma.chartAnalysis.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!analysis) notFound();

  const support = JSON.parse(analysis.support || "[]") as string[];
  const resistance = JSON.parse(analysis.resistance || "[]") as string[];
  const bias = analysis.marketBias as MarketBias;
  const badgeClass =
    bias === "bullish" ? "bg-emerald-100 text-emerald-800" : bias === "bearish" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800";

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          ← Dashboard
        </Link>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}>
              {MARKET_BIAS_LABELS[bias] ?? analysis.marketBias}
            </span>
            <span className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(analysis.createdAt), { addSuffix: true })}
            </span>
          </div>

          <div className="mb-8 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            <ChartImage src={getUploadUrl(analysis.imageUrl)} alt="Chart" />
          </div>

          {analysis.confidence != null && (
            <div className="mb-6 rounded-xl border border-gray-200 bg-gray-100 px-4 py-3">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">Confidence</span>
              <span className="font-mono text-sm font-medium text-gray-900">{analysis.confidence}%</span>
            </div>
          )}
          <div className="mb-8 grid grid-cols-2 gap-6 sm:grid-cols-3">
            <div>
              <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">Support</span>
              <ul className="font-mono text-sm text-gray-900">
                {support.length ? support.map((s, i) => <li key={i}>{s}</li>) : "—"}
              </ul>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">Resistance</span>
              <ul className="font-mono text-sm text-gray-900">
                {resistance.length ? resistance.map((r, i) => <li key={i}>{r}</li>) : "—"}
              </ul>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">Risk:Reward</span>
              <span className="font-mono text-sm text-gray-900">{analysis.riskReward ?? "—"}</span>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">Entry</span>
              <span className="font-mono text-sm text-emerald-700">{analysis.entry ?? "—"}</span>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">Take profit</span>
              <span className="font-mono text-sm text-emerald-700">{analysis.takeProfit ?? "—"}</span>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">Take profit 2</span>
              <span className="font-mono text-sm text-emerald-700">{analysis.takeProfit2 ?? "—"}</span>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">Stop loss</span>
              <span className="font-mono text-sm text-red-700">{analysis.stopLoss ?? "—"}</span>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">Stop loss 2</span>
              <span className="font-mono text-sm text-red-700">{analysis.stopLoss2 ?? "—"}</span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">Reasoning</span>
            <p className="text-sm leading-relaxed text-gray-700">{analysis.reasoning}</p>
          </div>
        </div>

        <Disclaimer />
      </main>
    </>
  );
}
