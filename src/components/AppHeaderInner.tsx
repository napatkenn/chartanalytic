"use client";

import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

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

export function AppHeaderInner({
  session,
  activePath,
  mobileMenuOpen,
  setMobileMenuOpen,
  resolvedTheme,
}: {
  session: { user?: { email?: string | null } } | null;
  activePath: string;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
  resolvedTheme: string | undefined;
}) {
  return (
    <>
      <div className="container relative mx-auto flex h-14 min-h-[3.5rem] max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:min-h-[4rem]">
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center gap-2 text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100"
        >
          <Logo size={28} invert={false} priority />
          <span className="hidden whitespace-nowrap sm:inline">{"ChartAnalytic".slice(0, 5)}<span className="text-emerald-500 m-0 p-0">{"ChartAnalytic"[5]}</span>{"ChartAnalytic".slice(6)}</span>
        </Link>

        {!session && (
          <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 md:flex">
            <Link
              href="/#features"
              className="rounded-lg px-3 py-2.5 text-sm font-medium transition min-h-[44px] flex items-center text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            >
              Features
            </Link>
            <Link
              href="/#pricing"
              className="rounded-lg px-3 py-2.5 text-sm font-medium transition min-h-[44px] flex items-center text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            >
              Pricing
            </Link>
            <Link
              href="/#how-it-works"
              className="rounded-lg px-3 py-2.5 text-sm font-medium transition min-h-[44px] flex items-center text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            >
              How it Works
            </Link>
          </nav>
        )}

        <div className="flex items-center gap-1">
          <nav className="hidden items-center gap-1 md:flex">
            {session ? (
              <>
                <Link
                  href="/analyze"
                  className={`rounded-lg px-4 py-2.5 text-sm font-medium transition min-h-[44px] flex items-center ${
                    activePath === "/analyze"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-white/10 dark:text-white"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                  }`}
                >
                  Analyze
                </Link>
                <Link
                  href="/subscribe"
                  className={`rounded-lg px-4 py-2.5 text-sm font-medium transition min-h-[44px] flex items-center ${
                    activePath === "/subscribe"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-white/10 dark:text-white"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                  }`}
                >
                  Subscribe
                </Link>
                <Link
                  href="/dashboard"
                  className={`rounded-lg px-4 py-2.5 text-sm font-medium transition min-h-[44px] flex items-center ${
                    activePath === "/dashboard"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-white/10 dark:text-white"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/api/auth/signout"
                  className="btn-secondary ml-2 min-h-[44px] flex items-center text-sm border-gray-300 bg-transparent text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Sign out
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-4 py-2.5 text-sm font-medium transition min-h-[44px] flex items-center text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="ml-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition min-h-[44px] flex items-center bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 md:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 top-[3.5rem] z-40 bg-black/40 sm:top-16 md:hidden"
          aria-hidden
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <div
        className={`fixed left-0 right-0 top-[3.5rem] z-50 max-h-[calc(100vh-3.5rem)] overflow-y-auto border-b border-gray-200 bg-white shadow-xl transition dark:border-gray-700 dark:bg-gray-900 md:hidden sm:top-16 ${
          mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
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
                      ? "bg-emerald-100 text-emerald-800 dark:bg-white/10 dark:text-white"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                  }`}
                >
                  Analyze
                </Link>
                <Link
                  href="/subscribe"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-xl px-4 py-3.5 text-base font-medium ${
                    activePath === "/subscribe"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-white/10 dark:text-white"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                  }`}
                >
                  Subscribe
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-xl px-4 py-3.5 text-base font-medium ${
                    activePath === "/dashboard"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-white/10 dark:text-white"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/api/auth/signout"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mt-2 rounded-xl px-4 py-3.5 text-base font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                >
                  Sign out
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-4 py-3.5 text-base font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  Features
                </Link>
                <Link
                  href="/#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-4 py-3.5 text-base font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  Pricing
                </Link>
                <Link
                  href="/#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-4 py-3.5 text-base font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  How it Works
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-4 py-3.5 text-base font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mt-2 rounded-xl px-4 py-3.5 text-base font-semibold bg-emerald-500 text-white hover:bg-emerald-600 dark:hover:bg-emerald-400"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        )}
      </div>
    </>
  );
}
