"use client";

import { useState } from "react";

type Outcome = "win" | "lose";

type Props = {
  analysisId: string;
  initialOutcome: Outcome | null;
  initialAmount: number | null;
};

export function TradeOutcomeForm({
  analysisId,
  initialOutcome,
  initialAmount,
}: Props) {
  const [outcome, setOutcome] = useState<Outcome | null>(initialOutcome);
  const [amount, setAmount] = useState(
    initialAmount != null ? String(initialAmount) : ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    const numAmount = amount.trim() === "" ? undefined : parseFloat(amount);
    if (amount.trim() !== "" && (Number.isNaN(numAmount) || !Number.isFinite(numAmount))) {
      setError("Enter a valid number.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/analysis/${analysisId}/outcome`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome: outcome ?? undefined,
          amount: numAmount,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to save.");
        return;
      }
      setSaved(true);
      if (numAmount !== undefined) setAmount(String(numAmount));
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
        Did this trade win or lose?
      </h3>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOutcome("win")}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
              outcome === "win"
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
            }`}
          >
            Win
          </button>
          <button
            type="button"
            onClick={() => setOutcome("lose")}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
              outcome === "lose"
                ? "border-red-500 bg-red-500 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
            }`}
          >
            Lose
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="trade-amount" className="text-sm text-gray-600">
            Amount
          </label>
          <input
            id="trade-amount"
            type="number"
            step="any"
            min="0"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || outcome == null}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          {saving ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
