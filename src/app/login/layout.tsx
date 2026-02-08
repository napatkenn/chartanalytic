import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in — ChartAnalytic",
  description: "Sign in to ChartAnalytic to analyze trading charts with AI-powered bias, levels, entry, TP, and SL.",
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
