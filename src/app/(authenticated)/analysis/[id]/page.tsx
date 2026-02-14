import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUploadUrl } from "@/lib/storage";
import { AnalysisDetailContent } from "@/components/AnalysisDetailContent";
import { TradeOutcomeForm } from "@/components/TradeOutcomeForm";
import { Disclaimer } from "@/components/Disclaimer";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Analysis — ChartAnalytic",
  description: "View your AI chart analysis: market bias, support and resistance, entry, TP, SL, and reasoning.",
};

export default async function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) notFound();

  const { id } = await params;
  const analysis = await prisma.chartAnalysis.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!analysis) notFound();

  const support = JSON.parse(analysis.support || "[]") as string[];
  const resistance = JSON.parse(analysis.resistance || "[]") as string[];

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          ← Dashboard
        </Link>
        <ThemeToggle />
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        <AnalysisDetailContent
          analysis={{
            marketBias: analysis.marketBias,
            confidence: analysis.confidence,
            createdAt: analysis.createdAt.toISOString(),
            support,
            resistance,
            entry: analysis.entry,
            takeProfit: analysis.takeProfit,
            takeProfit2: analysis.takeProfit2,
            stopLoss: analysis.stopLoss,
            stopLoss2: analysis.stopLoss2,
            riskReward: analysis.riskReward,
            reasoning: analysis.reasoning,
            invalidationLevel: analysis.invalidationLevel ?? undefined,
            keyRisk: analysis.keyRisk ?? undefined,
          }}
          chartImageUrl={getUploadUrl(analysis.imageUrl)}
        />
        <div className="mt-6">
          <TradeOutcomeForm
            analysisId={analysis.id}
            initialOutcome={
              analysis.tradeOutcome === "win" || analysis.tradeOutcome === "lose"
                ? analysis.tradeOutcome
                : null
            }
            initialAmount={analysis.tradeAmount ?? null}
          />
        </div>
        <Disclaimer />
      </main>
    </>
  );
}
