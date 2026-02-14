"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export function DashboardHeaderActions() {
  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      <Link
        href="/analyze"
        className="flex min-h-[44px] items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 active:bg-emerald-700"
      >
        + Create
      </Link>
    </div>
  );
}
