"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MARKET_BIAS_LABELS } from "@/lib/analysis-types";
import type { AnalysisResult, MarketBias } from "@/lib/analysis-types";

type AnalysisWithMeta = {
  id: string;
  imageUrl: string;
  createdAt: string;
} & AnalysisResult;

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{children}</span>;
}

export function AnalysisResultCard({
  analysis,
  creditsRemaining,
  dailyLimit,
}: {
  analysis: AnalysisWithMeta;
  creditsRemaining: number;
  dailyLimit?: number;
}) {
  const bias = analysis.marketBias as MarketBias;
  const biasClass =
    bias === "bullish"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30"
      : bias === "bearish"
        ? "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30"
        : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-lg border px-2.5 py-1 text-sm font-medium ${biasClass}`}>
          {MARKET_BIAS_LABELS[bias] ?? analysis.marketBias}
        </span>
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
          {formatDistanceToNow(new Date(analysis.createdAt), { addSuffix: true })}
        </span>
        {dailyLimit != null ? (
          <span className="text-xs text-gray-500 dark:text-gray-400">· {creditsRemaining} / {dailyLimit} uploads today</span>
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400">· {creditsRemaining} credits left</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Support</Label>
          <ul className="font-mono text-sm text-gray-900 dark:text-gray-200">
            {analysis.support.length ? analysis.support.map((s, i) => <li key={i}>{s}</li>) : "—"}
          </ul>
        </div>
        <div>
          <Label>Resistance</Label>
          <ul className="font-mono text-sm text-gray-900 dark:text-gray-200">
            {analysis.resistance.length ? analysis.resistance.map((r, i) => <li key={i}>{r}</li>) : "—"}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 dark:bg-surface-800/50">
        <div>
          <Label>Entry</Label>
          <span className="font-mono text-sm text-emerald-700 dark:text-emerald-400">{analysis.entry || "—"}</span>
        </div>
        <div>
          <Label>Take profit</Label>
          <span className="font-mono text-sm text-emerald-700 dark:text-emerald-400">{analysis.takeProfit || "—"}</span>
        </div>
        <div>
          <Label>Stop loss</Label>
          <span className="font-mono text-sm text-red-600 dark:text-red-400">{analysis.stopLoss || "—"}</span>
        </div>
        <div>
          <Label>Risk:Reward</Label>
          <span className="font-mono text-sm text-gray-900 dark:text-gray-200">{analysis.riskReward || "—"}</span>
        </div>
      </div>

      <div>
        <Label>Reasoning</Label>
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-400">{analysis.reasoning}</p>
      </div>

      <Link
        href={`/analysis/${analysis.id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-cyan-400 dark:hover:text-cyan-300"
      >
        View full analysis
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
