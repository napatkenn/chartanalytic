"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/gtag";

type Props = {
  href: string;
  className?: string;
  children: React.ReactNode;
  source?: string;
};

export function StartTrialLink({ href, className, children, source = "homepage" }: Props) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => trackEvent("generate_lead", { source })}
    >
      {children}
    </Link>
  );
}
