"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { formatDistanceToNow } from "date-fns";
import { MARKET_BIAS_LABELS } from "@/lib/analysis-types";
import type { MarketBias } from "@/lib/analysis-types";

type ExportAnalysis = {
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
};

type Props = {
  analysis: ExportAnalysis;
  chartImageUrl: string;
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
      {children}
    </span>
  );
}

export function AnalysisExportCard({ analysis, chartImageUrl }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const bias = analysis.marketBias as MarketBias;
  const badgeClass =
    bias === "bullish"
      ? "bg-emerald-100 text-emerald-800"
      : bias === "bearish"
        ? "bg-red-100 text-red-800"
        : "bg-amber-100 text-amber-800";

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
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
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-emerald-600 disabled:opacity-60"
      >
        {downloading ? "Creating image…" : "Download as image"}
      </button>

      {/* Card layout matching reference: chart + three-column analysis panel */}
      <div
        ref={cardRef}
        className="w-full max-w-[900px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
        style={{ width: 900 }}
      >
        {/* Top: bias, time, confidence */}
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 bg-white px-5 py-3">
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${badgeClass}`}>
            {MARKET_BIAS_LABELS[bias] ?? analysis.marketBias}
          </span>
          <span className="text-sm text-gray-500">
            {formatDistanceToNow(new Date(analysis.createdAt), { addSuffix: true })}
          </span>
          {analysis.confidence != null && (
            <span className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-0.5 font-mono text-sm font-medium text-gray-700">
              {analysis.confidence}% confidence
            </span>
          )}
        </div>

        {/* Chart image */}
        <div className="border-b border-gray-200 bg-gray-50">
          <img
            src={chartImageUrl}
            alt="Chart"
            className="w-full object-contain"
            crossOrigin="anonymous"
          />
        </div>

        {/* Three-column analysis panel (like reference) */}
        <div className="grid grid-cols-3 gap-0 border-t border-gray-200">
          {/* Column 1 */}
          <div className="border-r border-gray-200 bg-gray-50/50 p-4">
            <Label>Support</Label>
            <ul className="font-mono text-sm text-gray-900">
              {analysis.support?.length
                ? analysis.support.map((s, i) => <li key={i}>{s}</li>)
                : "—"}
            </ul>
            <div className="mt-4">
              <Label>Entry</Label>
              <span className="font-mono text-sm font-semibold text-emerald-700">
                {analysis.entry ?? "—"}
              </span>
            </div>
            <div className="mt-4">
              <Label>Stop loss</Label>
              <span className="font-mono text-sm font-semibold text-red-700">
                {analysis.stopLoss ?? "—"}
              </span>
            </div>
          </div>
          {/* Column 2 */}
          <div className="border-r border-gray-200 bg-gray-50/50 p-4">
            <Label>Resistance</Label>
            <ul className="font-mono text-sm text-gray-900">
              {analysis.resistance?.length
                ? analysis.resistance.map((r, i) => <li key={i}>{r}</li>)
                : "—"}
            </ul>
            <div className="mt-4">
              <Label>Take profit</Label>
              <span className="font-mono text-sm font-semibold text-emerald-700">
                {analysis.takeProfit ?? "—"}
              </span>
            </div>
            <div className="mt-4">
              <Label>Stop loss 2</Label>
              <span className="font-mono text-sm font-semibold text-red-700">
                {analysis.stopLoss2 ?? "—"}
              </span>
            </div>
          </div>
          {/* Column 3 */}
          <div className="bg-gray-50/50 p-4">
            <Label>Risk:Reward</Label>
            <span className="font-mono text-sm font-medium text-gray-900">
              {analysis.riskReward ?? "—"}
            </span>
            <div className="mt-4">
              <Label>Take profit 2</Label>
              <span className="font-mono text-sm font-semibold text-emerald-700">
                {analysis.takeProfit2 ?? "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
