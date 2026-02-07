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
  return <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-600">{children}</span>;
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
      ? "bg-emerald-100 text-emerald-800"
      : bias === "bearish"
        ? "bg-red-100 text-red-800"
        : "bg-amber-100 text-amber-800";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-lg border px-2.5 py-1 text-sm font-medium ${biasClass}`}>
          {MARKET_BIAS_LABELS[bias] ?? analysis.marketBias}
        </span>
        <span className="font-mono text-xs text-gray-600">
          {formatDistanceToNow(new Date(analysis.createdAt), { addSuffix: true })}
        </span>
        {dailyLimit != null ? (
          <span className="text-xs text-gray-600">· {creditsRemaining} / {dailyLimit} uploads today</span>
        ) : (
          <span className="text-xs text-gray-600">· {creditsRemaining} credits left</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Support</Label>
          <ul className="font-mono text-sm text-gray-900">
            {analysis.support.length ? analysis.support.map((s, i) => <li key={i}>{s}</li>) : "—"}
          </ul>
        </div>
        <div>
          <Label>Resistance</Label>
          <ul className="font-mono text-sm text-gray-900">
            {analysis.resistance.length ? analysis.resistance.map((r, i) => <li key={i}>{r}</li>) : "—"}
          </ul>
        </div>
      </div>

      {analysis.confidence != null && (
        <div className="rounded-xl border border-gray-200 bg-gray-100 px-4 py-2">
          <Label>Confidence</Label>
          <span className="font-mono text-sm font-medium text-gray-900">{analysis.confidence}%</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-gray-100 p-4 sm:grid-cols-3">
        <div>
          <Label>Entry</Label>
          <span className="font-mono text-sm font-medium text-emerald-800">{analysis.entry || "—"}</span>
        </div>
        <div>
          <Label>Take profit</Label>
          <span className="font-mono text-sm font-medium text-emerald-800">{analysis.takeProfit || "—"}</span>
        </div>
        <div>
          <Label>Take profit 2</Label>
          <span className="font-mono text-sm font-medium text-emerald-800">{analysis.takeProfit2 || "—"}</span>
        </div>
        <div>
          <Label>Stop loss</Label>
          <span className="font-mono text-sm font-medium text-red-800">{analysis.stopLoss || "—"}</span>
        </div>
        <div>
          <Label>Stop loss 2</Label>
          <span className="font-mono text-sm font-medium text-red-800">{analysis.stopLoss2 || "—"}</span>
        </div>
        <div>
          <Label>Risk:Reward</Label>
          <span className="font-mono text-sm font-medium text-gray-900">{analysis.riskReward || "—"}</span>
        </div>
      </div>

      <div>
        <Label>Reasoning</Label>
        <p className="text-sm leading-relaxed text-gray-700">{analysis.reasoning}</p>
      </div>

      <Link
        href={`/analysis/${analysis.id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
      >
        View full analysis
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
