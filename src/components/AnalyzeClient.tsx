"use client";

import { useState, useRef, useEffect } from "react";
import { AnalysisResultCard } from "./AnalysisResultCard";
import type { AnalysisResult } from "@/lib/analysis-types";

interface ApiResponse {
  analysis: {
    id: string;
    imageUrl: string;
    createdAt: string;
  } & AnalysisResult;
  creditsRemaining: number;
  dailyLimit: number | null;
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

export function AnalyzeClient() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remainingToday, setRemainingToday] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const [subRes, creditsRes] = await Promise.all([
        fetch("/api/subscription"),
        fetch("/api/credits"),
      ]);
      const subData = await subRes.json();
      const creditsData = await creditsRes.json();
      if (subRes.ok && subData.active) {
        setRemainingToday(subData.remainingToday ?? 0);
        setDailyLimit(subData.dailyLimit ?? null);
      } else if (creditsRes.ok && typeof creditsData.credits === "number") {
        setRemainingToday(creditsData.credits);
        setDailyLimit(null);
      }
    })();
  }, []);

  const handleFile = (f: File | null) => {
    setError(null);
    setResult(null);
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(f.type)) {
      setError("Use PNG, JPEG, or WebP.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File must be under 10MB.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0] ?? null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0] ?? null);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  const runAnalysis = async () => {
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const form = new FormData();
      form.set("chart", file);
      const res = await fetch("/api/analyze", { method: "POST", body: form });
      let data: { error?: string; code?: string; creditsRemaining?: number; dailyLimit?: number | null };
      try {
        data = await res.json();
      } catch {
        setError(res.status === 401 ? "Please log in again." : "Server error. Try again.");
        return;
      }
      if (!res.ok) {
        if (res.status === 401) {
          setError("Session expired. Please log in again.");
          return;
        }
        if (res.status === 402 && (data.code === "SUBSCRIPTION_REQUIRED" || data.code === "CREDITS_REQUIRED")) {
          window.location.href = "/subscribe";
          return;
        }
        setError(data.error ?? "Analysis failed.");
        return;
      }
      setResult(data as ApiResponse);
      setRemainingToday(data.creditsRemaining ?? null);
      setDailyLimit(data.dailyLimit ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network or server error.";
      setError(message.includes("fetch") ? "Network error. Check your connection and try again." : message);
    } finally {
      setLoading(false);
    }
  };

  const loadUsage = async () => {
    const [subRes, creditsRes] = await Promise.all([
      fetch("/api/subscription"),
      fetch("/api/credits"),
    ]);
    const subData = await subRes.json();
    const creditsData = await creditsRes.json();
    if (subRes.ok && subData.active) {
      setRemainingToday(subData.remainingToday ?? 0);
      setDailyLimit(subData.dailyLimit ?? null);
    } else if (creditsRes.ok && typeof creditsData.credits === "number") {
      setRemainingToday(creditsData.credits);
      setDailyLimit(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Chart preview – always light themed */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-gray-900">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Chart preview
        </h2>
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`relative flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition ${
            dragOver
              ? "border-emerald-500/50 bg-emerald-500/5"
              : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onFileChange}
            className="hidden"
          />
          {preview ? (
            <img
              src={preview}
              alt="Chart preview"
              className="max-h-[320px] w-auto max-w-full object-contain"
            />
          ) : (
            <>
              <UploadIcon className="mb-3 h-12 w-12 text-gray-400" />
              <p className="text-sm font-medium text-gray-600">Drop chart here or click to upload</p>
              <p className="mt-1 text-xs text-gray-500">PNG, JPEG, WebP · max 10MB</p>
            </>
          )}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={runAnalysis}
            disabled={!file || loading}
            className="rounded-xl bg-emerald-500 px-5 py-2.5 font-semibold text-white shadow transition hover:bg-emerald-600 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Analyzing…
              </span>
            ) : (
              "Analyze chart"
            )}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {/* Results – always light themed */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-gray-900">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Results
        </h2>
        {result ? (
          <AnalysisResultCard
            analysis={result.analysis}
            creditsRemaining={result.creditsRemaining}
            dailyLimit={result.dailyLimit ?? undefined}
          />
        ) : (
          <div className="min-h-[280px] overflow-y-auto rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Chart Upload Guidelines</p>
            <ul className="space-y-3 text-xs text-gray-600">
              <li className="flex gap-2">
                <span className="shrink-0 text-emerald-600" aria-hidden>✓</span>
                <div>
                  <span className="font-medium text-gray-700">Allowed Chart Type:</span>
                  <span className="ml-1 text-gray-600">Only Candlestick Charts are accepted for accurate AI analysis.</span>
                </div>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0" aria-hidden>📤</span>
                <div>
                  <span className="font-medium text-gray-700">How to Upload:</span>
                  <span className="ml-1 text-gray-600">Paste using Ctrl + V or upload an image file (PNG, JPG).</span>
                </div>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0" aria-hidden>⏱️</span>
                <div>
                  <span className="font-medium text-gray-700">Supported Time Frames:</span>
                  <span className="ml-1 text-gray-600">Scalping: 1m, 3m, 5m · Intraday: 15m, 30m · Swing: 1H, 4H · Short-Term: 1D · Long-Term: 1W, 1M</span>
                </div>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0" aria-hidden>🔍</span>
                <div>
                  <span className="font-medium text-gray-700">Chart Requirements:</span>
                  <span className="ml-1 text-gray-600">Include clear Symbol and Time Frame; remove drawings/indicators; zoom in and avoid clutter.</span>
                </div>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0" aria-hidden>📷</span>
                <div>
                  <span className="font-medium text-gray-700">TradingView:</span>
                  <span className="ml-1 text-gray-600">Reset Chart → Camera Icon → Copy Chart Image → paste here (Ctrl + V) or Choose File.</span>
                </div>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
