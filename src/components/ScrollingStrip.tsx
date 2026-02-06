"use client";

const PILLS = [
  "AI chart analysis",
  "Support & resistance",
  "Entry • TP • SL",
  "Risk:reward",
  "multi-timeframe support",
  "No credit card",
  "Free trial",
  "BoomFi crypto",
];

export function ScrollingStrip() {
  return (
    <div className="relative overflow-hidden border-y border-gray-200 bg-gray-50 py-3">
      <div className="flex animate-scroll gap-8 whitespace-nowrap">
        {[...PILLS, ...PILLS].map((label, i) => (
          <span
            key={i}
            className="text-sm font-medium text-gray-500"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
