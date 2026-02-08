import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AnalyzeClient } from "@/components/AnalyzeClient";
import { Disclaimer } from "@/components/Disclaimer";

export const metadata: Metadata = {
  title: "Analyze — ChartAnalytic",
  description: "Upload a chart for AI analysis. Get market bias, support and resistance, entry, TP, SL, and reasoning.",
};

export default async function AnalyzePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
        <p className="text-sm text-gray-500">Analyze</p>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Chart analysis</h1>
            <p className="mt-1 text-gray-500">
              Upload a chart with multi-timeframe support (PNG, JPEG, or WebP · max 10MB).
            </p>
          </div>
          <div className="hidden sm:block w-48 flex-shrink-0 opacity-80">
            <Image src="/images/analyze-upload.svg" alt="" width={320} height={200} className="w-full h-auto" />
          </div>
        </div>
        <AnalyzeClient />
        <div className="mt-10">
          <Disclaimer />
        </div>
      </main>
    </>
  );
}
