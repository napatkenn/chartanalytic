"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function AppHeader({
  session,
  activePath = "/",
}: {
  session: { user?: { email?: string | null } } | null;
  activePath?: string;
}) {
  const isLight = !session;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (mobileMenuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-xl safe-area-inset-top ${
        isLight
          ? "border-gray-200 bg-white/95"
          : "border-white/[0.06] bg-surface-950/80"
      }`}
    >
      <div className="container relative mx-auto flex h-14 min-h-[3.5rem] max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:min-h-[4rem]">
        <Link
          href="/"
          className={`flex min-w-0 shrink-0 items-center gap-2 text-lg font-bold tracking-tight ${
            isLight ? "text-gray-900" : "text-white"
          }`}
        >
          <Logo size={28} invert={!isLight} priority />
          <span className="hidden whitespace-nowrap sm:inline">{"ChartAnalytic".slice(0, 5)}<span className="text-emerald-500 m-0 p-0">{"ChartAnalytic"[5]}</span>{"ChartAnalytic".slice(6)}</span>
        </Link>

        {/* Desktop nav — center: section links (when logged out) */}
        {!session && (
          <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 md:flex">
            <Link
              href="/#features"
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition min-h-[44px] flex items-center ${
                isLight ? "text-gray-600 hover:bg-gray-100" : "text-gray-300 hover:bg-white/5"
              }`}
            >
              Features
            </Link>
            <Link
              href="/#pricing"
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition min-h-[44px] flex items-center ${
                isLight ? "text-gray-600 hover:bg-gray-100" : "text-gray-300 hover:bg-white/5"
              }`}
            >
              Pricing
            </Link>
            <Link
              href="/#how-it-works"
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition min-h-[44px] flex items-center ${
                isLight ? "text-gray-600 hover:bg-gray-100" : "text-gray-300 hover:bg-white/5"
              }`}
            >
              How it Works
            </Link>
          </nav>
        )}

        {/* Desktop nav — right: auth or app links */}
        <nav className="hidden items-center gap-1 md:flex">
          {session ? (
            <>
              <Link
                href="/analyze"
                className={`rounded-lg px-4 py-2.5 text-sm font-medium transition min-h-[44px] flex items-center ${
                  activePath === "/analyze" ? "nav-link-active bg-white/5" : "nav-link"
                }`}
              >
                Analyze
              </Link>
              <Link
                href="/subscribe"
                className={`rounded-lg px-4 py-2.5 text-sm font-medium transition min-h-[44px] flex items-center ${
                  activePath === "/subscribe" ? "nav-link-active bg-white/5" : "nav-link"
                }`}
              >
                Subscribe
              </Link>
              <Link
                href="/dashboard"
                className={`rounded-lg px-4 py-2.5 text-sm font-medium transition min-h-[44px] flex items-center ${
                  activePath === "/dashboard" ? "nav-link-active bg-white/5" : "nav-link"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/api/auth/signout"
                className="btn-secondary ml-2 min-h-[44px] flex items-center text-sm"
              >
                Sign out
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`rounded-lg px-4 py-2.5 text-sm font-medium transition min-h-[44px] flex items-center ${
                  isLight ? "text-gray-600 hover:bg-gray-100" : "btn-ghost"
                }`}
              >
                Log in
              </Link>
              <Link
                href="/register"
                className={`ml-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition min-h-[44px] flex items-center ${
                  isLight
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "btn-primary"
                }`}
              >
                Sign up
              </Link>
            </>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((o) => !o)}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg md:hidden ${
            isLight ? "text-gray-700 hover:bg-gray-100" : "text-gray-300 hover:bg-white/10"
          }`}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 top-[3.5rem] z-40 bg-black/40 sm:top-16 md:hidden"
          aria-hidden
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <div
        className={`fixed left-0 right-0 top-[3.5rem] z-50 max-h-[calc(100vh-3.5rem)] overflow-y-auto border-b shadow-xl transition md:hidden sm:top-16 ${
          mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        } ${isLight ? "border-gray-200 bg-white" : "border-white/10 bg-surface-900"}`}
      >
        {mobileMenuOpen && (
          <nav className="flex flex-col p-4 gap-0.5">
            {session ? (
              <>
                <Link
                  href="/analyze"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-xl px-4 py-3.5 text-base font-medium ${
                    activePath === "/analyze"
                      ? isLight ? "bg-emerald-100 text-emerald-800" : "bg-white/10 text-white"
                      : isLight ? "text-gray-700 hover:bg-gray-100" : "text-gray-300 hover:bg-white/5"
                  }`}
                >
                  Analyze
                </Link>
                <Link
                  href="/subscribe"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-xl px-4 py-3.5 text-base font-medium ${
                    activePath === "/subscribe"
                      ? isLight ? "bg-emerald-100 text-emerald-800" : "bg-white/10 text-white"
                      : isLight ? "text-gray-700 hover:bg-gray-100" : "text-gray-300 hover:bg-white/5"
                  }`}
                >
                  Subscribe
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-xl px-4 py-3.5 text-base font-medium ${
                    activePath === "/dashboard"
                      ? isLight ? "bg-emerald-100 text-emerald-800" : "bg-white/10 text-white"
                      : isLight ? "text-gray-700 hover:bg-gray-100" : "text-gray-300 hover:bg-white/5"
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/api/auth/signout"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`mt-2 rounded-xl px-4 py-3.5 text-base font-medium ${
                    isLight ? "text-gray-600 hover:bg-gray-100" : "text-gray-400 hover:bg-white/5"
                  }`}
                >
                  Sign out
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-xl px-4 py-3.5 text-base font-medium ${
                    isLight ? "text-gray-700 hover:bg-gray-100" : "text-gray-300 hover:bg-white/5"
                  }`}
                >
                  Features
                </Link>
                <Link
                  href="/#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-xl px-4 py-3.5 text-base font-medium ${
                    isLight ? "text-gray-700 hover:bg-gray-100" : "text-gray-300 hover:bg-white/5"
                  }`}
                >
                  Pricing
                </Link>
                <Link
                  href="/#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-xl px-4 py-3.5 text-base font-medium ${
                    isLight ? "text-gray-700 hover:bg-gray-100" : "text-gray-300 hover:bg-white/5"
                  }`}
                >
                  How it Works
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-xl px-4 py-3.5 text-base font-medium ${
                    isLight ? "text-gray-700 hover:bg-gray-100" : "text-gray-300 hover:bg-white/5"
                  }`}
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`mt-2 rounded-xl px-4 py-3.5 text-base font-semibold ${
                    isLight
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-emerald-500 text-white hover:bg-emerald-400"
                  }`}
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
