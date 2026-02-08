import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up — ChartAnalytic",
  description: "Create a ChartAnalytic account. Start your free trial for AI chart analysis with bias, levels, entry, TP, and SL.",
};

export default function RegisterLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
