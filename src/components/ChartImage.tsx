"use client";

import { useState } from "react";

const PLACEHOLDER = (
  <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
    <p className="text-sm font-medium text-gray-600">Chart image no longer available</p>
    <p className="mt-1 text-xs text-gray-500">
      This analysis was saved before persistent storage was enabled. The text results below are still valid.
    </p>
  </div>
);

/**
 * Renders the chart image or a placeholder when the image is missing (e.g. old
 * analyses whose file was stored on ephemeral disk before Blob was enabled).
 */
export function ChartImage({ src, alt = "Chart" }: { src: string; alt?: string }) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return PLACEHOLDER;
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full object-contain"
      onError={() => setError(true)}
    />
  );
}
