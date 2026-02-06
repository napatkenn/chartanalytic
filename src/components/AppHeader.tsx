import Link from "next/link";

export function AppHeader({
  session,
  activePath = "/",
}: {
  session: { user?: { email?: string | null } } | null;
  activePath?: string;
}) {
  const isLight = !session;

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-xl ${
        isLight
          ? "border-gray-200 bg-white/95"
          : "border-white/[0.06] bg-surface-950/80"
      }`}
    >
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className={`flex items-center gap-2 text-lg font-bold tracking-tight ${
            isLight ? "text-gray-900" : "text-white"
          }`}
        >
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold shadow-lg ${
              isLight
                ? "bg-emerald-500 text-white shadow-emerald-500/20"
                : "bg-gradient-to-br from-cyan-500 to-cyan-700 text-white shadow-cyan-500/20"
            }`}
          >
            C
          </span>
          ChartAnalytic
        </Link>

        <nav className="flex items-center gap-1">
          {session ? (
            <>
              <Link
                href="/analyze"
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  activePath === "/analyze" ? "nav-link-active bg-white/5" : "nav-link"
                }`}
              >
                Analyze
              </Link>
              <Link
                href="/subscribe"
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  activePath === "/subscribe" ? "nav-link-active bg-white/5" : "nav-link"
                }`}
              >
                Subscribe
              </Link>
              <Link
                href="/dashboard"
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  activePath === "/dashboard" ? "nav-link-active bg-white/5" : "nav-link"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/api/auth/signout"
                className="btn-secondary ml-2 text-sm"
              >
                Sign out
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  isLight ? "text-gray-600 hover:bg-gray-100" : "btn-ghost"
                }`}
              >
                Log in
              </Link>
              <Link
                href="/register"
                className={`ml-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
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
      </div>
    </header>
  );
}
