"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { AnalysisResultCard } from "./AnalysisResultCard";
import type { AnalysisResult, AnalysisOptions } from "@/lib/analysis-types";
import { DEFAULT_ANALYSIS_OPTIONS } from "@/lib/analysis-types";
import { trackEvent } from "@/lib/gtag";

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

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export function AnalyzeClient() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remainingToday, setRemainingToday] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [options, setOptions] = useState<AnalysisOptions>(() => ({ ...DEFAULT_ANALYSIS_OPTIONS }));
  const [optionsUsed, setOptionsUsed] = useState<AnalysisOptions | null>(null);
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
        setIsSubscribed(true);
      } else if (creditsRes.ok && typeof creditsData.credits === "number") {
        setRemainingToday(creditsData.credits);
        setDailyLimit(null);
        setIsSubscribed(false);
      }
    })();
  }, []);

  // When not subscribed, reset subscriber-only options to defaults
  useEffect(() => {
    if (!isSubscribed) {
      setOptions((o) => {
        const changed =
          o.numTp === 2 ||
          o.numSl === 2 ||
          o.reasoningDepth !== "standard" ||
          (o.maxSupportResistance ?? 2) !== 2 ||
          o.tradingStyle != null ||
          o.includeInvalidation ||
          o.includeCaveat;
        if (!changed) return o;
        return {
          ...o,
          numTp: 1,
          numSl: 1,
          reasoningDepth: "standard",
          maxSupportResistance: 2,
          tradingStyle: undefined,
          includeInvalidation: false,
          includeCaveat: false,
        };
      });
    }
  }, [isSubscribed]);

  const handleFile = (f: File | null) => {
    setError(null);
    setResult(null);
    setOptionsUsed(null);
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

  const REQUEST_TIMEOUT_MS = 125_000; // 125s — slightly above server OpenAI timeout so user sees server error when possible

  const runAnalysis = async () => {
    if (!file) return;
    trackEvent("analysis_started");
    setError(null);
    setErrorCode(null);
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const form = new FormData();
      form.set("chart", file);
      form.set("numTp", String(options.numTp));
      form.set("numSl", String(options.numSl));
      form.set("includeConfidence", options.includeConfidence !== false ? "true" : "false");
      form.set("includeRiskReward", options.includeRiskReward !== false ? "true" : "false");
      form.set("reasoningDepth", options.reasoningDepth ?? "standard");
      form.set("maxSupportResistance", String(options.maxSupportResistance ?? 2));
      if (options.tradingStyle) form.set("tradingStyle", options.tradingStyle);
      form.set("includeInvalidation", options.includeInvalidation === true ? "true" : "false");
      form.set("includeCaveat", options.includeCaveat === true ? "true" : "false");
      const res = await fetch("/api/analyze", { method: "POST", body: form, signal: controller.signal });
      clearTimeout(timeoutId);
      let data: { error?: string; code?: string; creditsRemaining?: number; dailyLimit?: number | null };
      try {
        data = await res.json();
      } catch {
        setError(res.status === 401 ? "Please log in again." : res.status === 504 ? "Analysis timed out. Try a smaller image or try again." : "Server error. Try again.");
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
        setErrorCode(data.code ?? null);
        setError(data.error ?? "Analysis failed.");
        return;
      }
      setResult(data as ApiResponse);
      setOptionsUsed({ ...options });
      trackEvent("analysis_complete");
      setRemainingToday(data.creditsRemaining ?? null);
      setDailyLimit(data.dailyLimit ?? null);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        setError("Request timed out. Try a smaller image or try again.");
        return;
      }
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
      setIsSubscribed(true);
    } else if (creditsRes.ok && typeof creditsData.credits === "number") {
      setRemainingToday(creditsData.credits);
      setDailyLimit(null);
      setIsSubscribed(false);
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
          <button
            type="button"
            onClick={() => setSettingsOpen((o) => !o)}
            className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
            title={settingsOpen ? "Hide settings" : "Analysis settings"}
          >
            <SettingsIcon className="h-5 w-5 text-gray-500" />
            Settings
          </button>
        </div>
        {/* Analysis settings panel: pops down below the buttons when open */}
        {settingsOpen && (
          <div className={`mt-4 rounded-xl border border-gray-200 p-4 ${!isSubscribed ? "bg-gray-50/80" : "bg-gray-50/50"}`}>
            {!isSubscribed && (
              <p className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-800 mb-4">
                You can view these options.{" "}
                <Link href="/subscribe" className="font-medium text-amber-700 underline hover:text-amber-800">
                  Upgrade your plan to customize
                </Link>
              </p>
            )}
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">Take profit targets</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => isSubscribed && setOptions((o) => ({ ...o, numTp: 1 }))}
                    disabled={!isSubscribed}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      options.numTp === 1
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : !isSubscribed
                          ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                          : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    1 target
                  </button>
                  <button
                    type="button"
                    onClick={() => isSubscribed && setOptions((o) => ({ ...o, numTp: 2 }))}
                    disabled={!isSubscribed}
                    title={!isSubscribed ? "Subscribe to change settings" : undefined}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      options.numTp === 2
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : !isSubscribed
                          ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                          : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    2 targets
                  </button>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">Stop loss levels</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => isSubscribed && setOptions((o) => ({ ...o, numSl: 1 }))}
                    disabled={!isSubscribed}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      options.numSl === 1
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : !isSubscribed
                          ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                          : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    1 level
                  </button>
                  <button
                    type="button"
                    onClick={() => isSubscribed && setOptions((o) => ({ ...o, numSl: 2 }))}
                    disabled={!isSubscribed}
                    title={!isSubscribed ? "Subscribe to change settings" : undefined}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      options.numSl === 2
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : !isSubscribed
                          ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                          : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    2 levels
                  </button>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">Support & resistance levels</p>
                <div className="flex flex-wrap items-center gap-2">
                  {([2, 3, 4] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => isSubscribed && setOptions((o) => ({ ...o, maxSupportResistance: n }))}
                      disabled={!isSubscribed}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                        (options.maxSupportResistance ?? 2) === n
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : !isSubscribed
                            ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                            : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      {n} levels
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">Trading style</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => isSubscribed && setOptions((o) => ({ ...o, tradingStyle: undefined }))}
                    disabled={!isSubscribed}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      !options.tradingStyle
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : !isSubscribed
                          ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                          : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    Any
                  </button>
                  {(["scalping", "day", "swing"] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => isSubscribed && setOptions((o) => ({ ...o, tradingStyle: style }))}
                      disabled={!isSubscribed}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition capitalize ${
                        options.tradingStyle === style
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : !isSubscribed
                            ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                            : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      {style === "day" ? "Day trade" : style}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">Reasoning depth</p>
                <div className="flex flex-wrap items-center gap-2">
                  {(["brief", "standard", "detailed"] as const).map((depth) => (
                    <button
                      key={depth}
                      type="button"
                      onClick={() => isSubscribed && setOptions((o) => ({ ...o, reasoningDepth: depth }))}
                      disabled={!isSubscribed}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition capitalize ${
                        (options.reasoningDepth ?? "standard") === depth
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : !isSubscribed
                            ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                            : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      {depth}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className={`flex items-center gap-2 text-sm ${!isSubscribed ? "cursor-not-allowed text-gray-400" : "cursor-pointer text-gray-700"}`}>
                  <input
                    type="checkbox"
                    checked={options.includeConfidence !== false}
                    onChange={(e) => isSubscribed && setOptions((o) => ({ ...o, includeConfidence: e.target.checked }))}
                    disabled={!isSubscribed}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                  />
                  Confidence score
                </label>
                <label className={`flex items-center gap-2 text-sm ${!isSubscribed ? "cursor-not-allowed text-gray-400" : "cursor-pointer text-gray-700"}`}>
                  <input
                    type="checkbox"
                    checked={options.includeRiskReward !== false}
                    onChange={(e) => isSubscribed && setOptions((o) => ({ ...o, includeRiskReward: e.target.checked }))}
                    disabled={!isSubscribed}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                  />
                  Risk:Reward ratio
                </label>
                <label className={`flex items-center gap-2 text-sm ${!isSubscribed ? "cursor-not-allowed text-gray-400" : "cursor-pointer text-gray-700"}`}>
                  <input
                    type="checkbox"
                    checked={options.includeInvalidation === true}
                    onChange={(e) => isSubscribed && setOptions((o) => ({ ...o, includeInvalidation: e.target.checked }))}
                    disabled={!isSubscribed}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                  />
                  Invalidation level
                </label>
                <label className={`flex items-center gap-2 text-sm ${!isSubscribed ? "cursor-not-allowed text-gray-400" : "cursor-pointer text-gray-700"}`}>
                  <input
                    type="checkbox"
                    checked={options.includeCaveat === true}
                    onChange={(e) => isSubscribed && setOptions((o) => ({ ...o, includeCaveat: e.target.checked }))}
                    disabled={!isSubscribed}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                  />
                  Key risk / caveat
                </label>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="mt-3">
            <p className="text-sm text-red-600">{error}</p>
            {errorCode === "DAILY_LIMIT" && (
              <Link href="/subscribe" className="mt-2 inline-block text-sm font-medium text-emerald-600 hover:text-emerald-700">
                Upgrade plan for more daily uploads →
              </Link>
            )}
          </div>
        )}
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
            analysisOptions={optionsUsed}
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
