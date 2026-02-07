"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/AppSidebar";

const STORAGE_KEY = "chartanalytic-sidebar-collapsed";

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
      />
      <div className={collapsed ? "pl-16" : "pl-56"}>{children}</div>
    </>
  );
}
