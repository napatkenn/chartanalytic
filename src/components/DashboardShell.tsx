"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/AppSidebar";

const STORAGE_KEY = "chartanalytic-sidebar-collapsed";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const set = () => setIsMobile(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);
  return isMobile;
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

export function DashboardShell({
  children,
  user,
  credits,
  planTier,
  hasSubscription,
  usage,
}: {
  children: React.ReactNode;
  user: { name?: string | null; email?: string | null };
  credits: number;
  planTier: string;
  hasSubscription: boolean;
  usage: { remaining: number; limit: number } | null;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setCollapsed(stored === "true");
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed, mounted]);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <AppSidebar
        user={user}
        credits={credits}
        planTier={planTier}
        hasSubscription={hasSubscription}
        usage={usage}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        isMobile={isMobile}
      />
      {isMobile && (
        <div className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 safe-area-inset-top md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100"
            aria-label="Open menu"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          <span className="truncate text-lg font-bold tracking-tight text-gray-900">Chart<span className="text-emerald-500">A</span>nalytic</span>
        </div>
      )}
      <div className={collapsed ? "pl-0 pt-14 md:pt-0 md:pl-16" : "pl-0 pt-14 md:pt-0 md:pl-56"}>
        {children}
      </div>
    </>
  );
}
