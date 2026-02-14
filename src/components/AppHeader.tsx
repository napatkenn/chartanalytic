"use client";

import { createElement, useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { AppHeaderInner } from "@/components/AppHeaderInner";

export function AppHeader({
  session,
  activePath = "/",
}: {
  session: { user?: { email?: string | null } } | null;
  activePath?: string;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (mobileMenuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const headerClassName =
    "sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-xl safe-area-inset-top dark:border-gray-700 dark:bg-gray-900/95";

  return createElement("header", { className: headerClassName }, createElement(AppHeaderInner, {
    session,
    activePath,
    mobileMenuOpen,
    setMobileMenuOpen,
    resolvedTheme,
  }));
}
