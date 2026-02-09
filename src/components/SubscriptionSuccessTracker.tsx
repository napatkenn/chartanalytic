"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/gtag";

function SubscriptionSuccessTrackerInner() {
  const searchParams = useSearchParams();
  const purchaseFiredRef = useRef(false);

  useEffect(() => {
    if (purchaseFiredRef.current) return;
    const success = searchParams.get("success");
    const source = searchParams.get("source");
    if (success !== "1" || source !== "boomfi") return;

    purchaseFiredRef.current = true;
    trackEvent("purchase");

    if (typeof window !== "undefined" && window.history?.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      url.searchParams.delete("source");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [searchParams]);

  return null;
}

export function SubscriptionSuccessTracker() {
  return (
    <Suspense fallback={null}>
      <SubscriptionSuccessTrackerInner />
    </Suspense>
  );
}
