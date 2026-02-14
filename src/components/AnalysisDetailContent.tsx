"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { formatDistanceToNow } from "date-fns";
import { MARKET_BIAS_LABELS } from "@/lib/analysis-types";
import type { MarketBias } from "@/lib/analysis-types";

type Props = {
  analysis: {
    marketBias: string;
    confidence: number | null;
    createdAt: string;
    support: string[];
    resistance: string[];
    entry: string | null;
    takeProfit: string | null;
    takeProfit2: string | null;
    stopLoss: string | null;
    stopLoss2: string | null;
    riskReward: string | null;
    reasoning: string;
    invalidationLevel?: string | null;
    keyRisk?: string | null;
  };
  chartImageUrl: string;
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
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
  value: string | null;
  variant?: "green" | "red" | "neutral";
}) {
  const valueClass =
    variant === "green"
      ? "text-emerald-700 dark:text-emerald-300 font-medium"
      : variant === "red"
        ? "text-red-700 dark:text-red-300 font-medium"
        : "text-gray-900 dark:text-gray-100 font-medium";
  return (
    <div className="min-w-0">
      <Label>{label}</Label>
      <span className={`font-mono text-sm ${valueClass}`}>{value ?? "—"}</span>
    </div>
  );
}

export function AnalysisDetailContent({ analysis, chartImageUrl }: Props) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const bias = analysis.marketBias as MarketBias;
  const badgeClass =
    bias === "bullish"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
      : bias === "bearish"
        ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
        : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";

  const handleDownload = async () => {
    if (!captureRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(captureRef.current, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
        includeQueryParams: true,
      });
      const link = document.createElement("a");
      link.download = `chart-analysis-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Single block: header + chart + analysis (capture ref kept for programmatic export via handleDownload) */}
      <div
        ref={captureRef}
        className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-700/50 px-6 py-4">
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${badgeClass}`}>
            {MARKET_BIAS_LABELS[bias] ?? analysis.marketBias}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {formatDistanceToNow(new Date(analysis.createdAt), { addSuffix: true })}
          </span>
          {analysis.confidence != null && (
            <span className="rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-600 px-2.5 py-0.5 font-mono text-sm font-medium text-gray-700 dark:text-gray-200">
              {analysis.confidence}% confidence
            </span>
          )}
        </div>

        {/* Chart */}
        <div className="overflow-hidden border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <img
            src={chartImageUrl}
            alt="Chart"
            className="w-full object-contain"
            crossOrigin="anonymous"
          />
        </div>

        {/* Analysis: one clean section */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-700/50 px-5 py-4">
            <div>
              <Label>Support</Label>
              <ul className="font-mono text-sm text-gray-900 dark:text-gray-100">
                {analysis.support?.length
                  ? analysis.support.map((s, i) => <li key={i}>{s}</li>)
                  : "—"}
              </ul>
            </div>
            <div>
              <Label>Resistance</Label>
              <ul className="font-mono text-sm text-gray-900 dark:text-gray-100">
                {analysis.resistance?.length
                  ? analysis.resistance.map((r, i) => <li key={i}>{r}</li>)
                  : "—"}
              </ul>
            </div>
            <div>
              <Label>Risk:Reward</Label>
              <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                {analysis.riskReward ?? "—"}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 bg-emerald-50/60 dark:bg-emerald-900/30 px-5 py-4 border-b border-gray-100 dark:border-gray-600">
              <LevelCell label="Entry" value={analysis.entry} variant="green" />
              <LevelCell label="Take profit" value={analysis.takeProfit} variant="green" />
              <LevelCell label="Take profit 2" value={analysis.takeProfit2} variant="green" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 bg-red-50/40 dark:bg-red-900/20 px-5 py-4">
              <LevelCell label="Stop loss" value={analysis.stopLoss} variant="red" />
              <LevelCell label="Stop loss 2" value={analysis.stopLoss2} variant="red" />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-700/50 px-5 py-4">
            <Label>Reasoning</Label>
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 mt-1">{analysis.reasoning}</p>
          </div>

          {analysis.invalidationLevel && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/30 px-5 py-4">
              <Label>Invalidation level</Label>
              <p className="font-mono text-sm font-medium text-amber-900 dark:text-amber-200 mt-1">{analysis.invalidationLevel}</p>
            </div>
          )}
          {analysis.keyRisk && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-700/50 px-5 py-4">
              <Label>Key risk / caveat</Label>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{analysis.keyRisk}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
