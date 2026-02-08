import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUploadUrl } from "@/lib/storage";
import { AnalysisDetailContent } from "@/components/AnalysisDetailContent";
import { Disclaimer } from "@/components/Disclaimer";

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
      <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          ← Dashboard
        </Link>
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
          }}
          chartImageUrl={getUploadUrl(analysis.imageUrl)}
        />
        <Disclaimer />
      </main>
    </>
  );
}
