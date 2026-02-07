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
  return (
    <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
      {children}
    </span>
  );
}

function LevelCell({
  label,
  value,
  variant = "neutral",
}: {
  label: string;
  value: string;
  variant?: "green" | "red" | "neutral";
}) {
  const valueClass =
    variant === "green"
      ? "text-emerald-700 font-medium"
      : variant === "red"
        ? "text-red-700 font-medium"
        : "text-gray-900 font-medium";
  return (
    <div className="min-w-0">
      <Label>{label}</Label>
      <span className={`font-mono text-sm ${valueClass}`}>{value || "—"}</span>
    </div>
  );
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
    <div className="space-y-6">
      {/* Header: bias, time, credits, confidence */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-lg border px-2.5 py-1 text-sm font-medium ${biasClass}`}
        >
          {MARKET_BIAS_LABELS[bias] ?? analysis.marketBias}
        </span>
        <span className="text-xs text-gray-500">
          {formatDistanceToNow(new Date(analysis.createdAt), { addSuffix: true })}
        </span>
        {analysis.confidence != null && (
          <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs font-medium text-gray-700">
            {analysis.confidence}% confidence
          </span>
        )}
        <span className="text-xs text-gray-400">
          {dailyLimit != null
            ? `· ${creditsRemaining} / ${dailyLimit} today`
            : `· ${creditsRemaining} credits`}
        </span>
      </div>

      {/* Support & Resistance */}
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3">
        <div>
          <Label>Support</Label>
          <ul className="font-mono text-sm text-gray-900">
            {analysis.support?.length
              ? analysis.support.map((s, i) => <li key={i}>{s}</li>)
              : "—"}
          </ul>
        </div>
        <div>
          <Label>Resistance</Label>
          <ul className="font-mono text-sm text-gray-900">
            {analysis.resistance?.length
              ? analysis.resistance.map((r, i) => <li key={i}>{r}</li>)
              : "—"}
          </ul>
        </div>
      </div>

      {/* Trade plan: Targets (Entry, TP, TP2) | Risk (SL, SL2, R:R) */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-emerald-50/60 px-4 py-3 border-b border-gray-100">
          <LevelCell label="Entry" value={analysis.entry ?? ""} variant="green" />
          <LevelCell label="Take profit" value={analysis.takeProfit ?? ""} variant="green" />
          <LevelCell label="Take profit 2" value={analysis.takeProfit2 ?? ""} variant="green" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-red-50/40 px-4 py-3">
          <LevelCell label="Stop loss" value={analysis.stopLoss ?? ""} variant="red" />
          <LevelCell label="Stop loss 2" value={analysis.stopLoss2 ?? ""} variant="red" />
          <LevelCell label="Risk:Reward" value={analysis.riskReward ?? ""} variant="neutral" />
        </div>
      </div>

      {/* Reasoning */}
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
