import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { SessionProvider } from "@/components/SessionProvider";
import "./globals.css";

// Ensure app is server-rendered so Vercel never serves static 404 for any route
export const dynamic = "force-dynamic";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "ChartAnalytic — AI Trading Chart Analysis",
  description:
    "Upload charts with multi-timeframe support for AI-powered bias, levels, entry, TP, SL, and reasoning. Not financial advice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plusJakarta.variable} ${jetbrainsMono.variable} font-sans min-h-screen bg-gray-50 text-gray-900`}
      >
        <SessionProvider>{children}</SessionProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
