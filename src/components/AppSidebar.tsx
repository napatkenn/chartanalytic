"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useRef, useState, useEffect } from "react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/analyze", label: "Analyze", icon: LinkIcon },
] as const;

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}
function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v10.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V3.75M3.75 12h16.5M12 3.75v16.5" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function AppSidebar({
  user,
  credits,
  planTier,
  hasSubscription,
  usage,
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onMobileClose,
  isMobile = false,
}: {
  user: { name?: string | null; email?: string | null };
  credits: number;
  planTier: string;
  hasSubscription: boolean;
  usage: { remaining: number; limit: number } | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  isMobile?: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [menuOpen]);

  const displayName = user.name || user.email || "User";
  const displaySub = user.email ? (user.email.length > 24 ? user.email.slice(0, 22) + "…" : user.email) : "ChartAnalytic";

  // Slider: subscription = remaining/limit (e.g. 2/10); free = credits with display max 10
  const isSubscriptionUsage = hasSubscription && usage;
  const current = isSubscriptionUsage ? usage.remaining : credits;
  const max = isSubscriptionUsage ? usage.limit : Math.max(credits, 10);
  const percent = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  const label = isSubscriptionUsage
    ? `${usage.remaining} / ${usage.limit} left today`
    : `${credits} credit${credits !== 1 ? "s" : ""}`;

  const sidebarWidth = collapsed && !isMobile ? "w-16" : "w-56";
  const logoRowPadding = collapsed && !isMobile ? "px-2 justify-center" : "px-4";
  const showExpanded = !collapsed || isMobile;

  return (
    <>
      {isMobile && mobileOpen && onMobileClose && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-hidden
          onClick={onMobileClose}
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-gray-200 bg-gray-50 transition-all duration-200 ${
          isMobile
            ? `w-72 shadow-xl ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:shadow-none`
            : `${sidebarWidth}`
        }`}
        style={isMobile ? { width: "18rem" } : undefined}
      >
        {/* Collapse toggle — only on desktop */}
        {onToggleCollapse && !isMobile && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="absolute right-0 top-[35%] z-50 flex h-9 w-9 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-md transition hover:bg-gray-50 hover:text-gray-900 hover:shadow-lg"
            aria-label={collapsed ? "Expand sidebar" : "Minimize sidebar"}
          >
            {collapsed ? (
              <ChevronRightIcon className="h-4 w-4" />
            ) : (
              <ChevronLeftIcon className="h-4 w-4" />
            )}
          </button>
        )}
        {isMobile && onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 md:hidden"
            aria-label="Close menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Logo */}
        <div className={`flex h-14 items-center gap-2 border-b border-gray-200 ${logoRowPadding} ${isMobile ? "px-4" : ""}`}>
          <Link href="/dashboard" onClick={isMobile ? onMobileClose : undefined} className={`flex min-w-0 items-center gap-2 ${!showExpanded ? "" : "flex-1"}`}>
            <Logo size={24} />
            {showExpanded && (
              <span className="truncate text-xl font-bold tracking-tight text-black">{"Chart"}<span className="text-emerald-500">A</span>{"nalytic"}</span>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav className={`flex-1 space-y-0.5 p-3 ${!showExpanded ? "flex flex-col items-center" : ""}`}>
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href === "/dashboard" && pathname === "/");
            return (
              <Link
                key={href}
                href={href}
                title={!showExpanded ? label : undefined}
                onClick={isMobile ? onMobileClose : undefined}
                className={`flex min-h-[44px] items-center rounded-lg py-2.5 text-sm font-medium transition ${
                  !showExpanded ? "w-10 justify-center px-0" : "gap-3 px-3"
                } ${
                  isActive
                    ? "bg-emerald-500 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {showExpanded && label}
              </Link>
            );
          })}
        </nav>

      {/* Credits / usage — compact when collapsed (desktop only) */}
      <div className={`border-t border-gray-200 p-3 ${!showExpanded ? "px-2" : ""}`}>
        {!showExpanded ? (
          <div className="flex flex-col items-center gap-1" title={label}>
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-700">
              {current}
            </div>
            <div className="h-1.5 w-full max-w-8 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${percent}%` }}
                role="progressbar"
                aria-valuenow={current}
                aria-valuemin={0}
                aria-valuemax={max}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-gray-500">{isSubscriptionUsage ? "Uploads today" : "Credits"}</span>
              <span className="font-semibold text-gray-900">{label}</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${percent}%` }}
                role="progressbar"
                aria-valuenow={current}
                aria-valuemin={0}
                aria-valuemax={max}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
              <span className="text-gray-500">Plan</span>
              <span className="font-semibold capitalize text-gray-900">{planTier}</span>
            </div>
            {!hasSubscription && (
              <Link
                href="/subscribe"
                className="mt-2 block w-full rounded-md bg-emerald-500 py-1.5 text-center text-xs font-medium text-white hover:bg-emerald-600"
              >
                Upgrade plan
              </Link>
            )}
            {hasSubscription && usage && usage.remaining === 0 && (
              <Link
                href="/subscribe"
                className="mt-2 block w-full rounded-md border border-emerald-500 py-1.5 text-center text-xs font-medium text-emerald-600 hover:bg-emerald-50"
              >
                Upgrade for more
              </Link>
            )}
          </div>
        )}
      </div>

      {/* User block */}
      <div className={`relative border-t border-gray-200 p-3 ${!showExpanded ? "px-2" : ""}`} ref={menuRef}>
        <div className={`flex items-center rounded-lg px-3 py-2 ${!showExpanded ? "justify-center px-0" : "gap-3"}`}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-3 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
              {displayName.charAt(0).toUpperCase()}
            </div>
            {showExpanded && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{displayName}</p>
                <p className="truncate text-xs text-gray-500">{displaySub}</p>
              </div>
            )}
          </button>
          {showExpanded && (
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              aria-label="User menu"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
          )}
        </div>
        {menuOpen && (
          <div className={`absolute bottom-14 rounded-lg border border-gray-200 bg-white py-1 shadow-lg ${!showExpanded ? "left-2 right-2" : "left-3 right-3"}`}>
            <Link
              href="/subscribe"
              className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => { setMenuOpen(false); isMobile && onMobileClose?.(); }}
            >
              Manage subscription
            </Link>
            <button
              type="button"
              onClick={() => { isMobile && onMobileClose?.(); signOut({ callbackUrl: "/" }); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
