import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  getActiveSubscription,
  getRemainingUploadsToday,
} from "@/lib/subscription";
import { getOrCreateCredits, consumeCredit } from "@/lib/credits";
import { analyzeChartImage } from "@/lib/ai-analysis";
import { saveUpload } from "@/lib/storage";
import { prisma } from "@/lib/db";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscription = await getActiveSubscription(session.user.id);
  let useCredits = false;

  if (subscription) {
    const remaining = await getRemainingUploadsToday(session.user.id);
    if (!remaining || remaining.remaining <= 0) {
      return NextResponse.json(
        {
          error: `Daily limit reached (${subscription.uploadsPerDay} uploads per day). Resets at midnight UTC.`,
          code: "DAILY_LIMIT",
        },
        { status: 402 }
      );
    }
  } else {
    const credits = await getOrCreateCredits(session.user.id);
    if (credits < 1) {
      return NextResponse.json(
        { error: "No credits left. Get more credits or subscribe to continue.", code: "CREDITS_REQUIRED" },
        { status: 402 }
      );
    }
    useCredits = true;
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const file = formData.get("chart") as File | null;
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing or invalid file: use field name 'chart'" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Allowed types: PNG, JPEG, WebP" },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large (max 10MB)" },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const imageUrl = await saveUpload(buffer, file.type);

  const base64 = buffer.toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

  let analysisResult;
  try {
    analysisResult = await analyzeChartImage(dataUrl);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analysis failed";
    return NextResponse.json(
      { error: `AI analysis failed: ${message}` },
      { status: 502 }
    );
  }

  if (useCredits) {
    await consumeCredit(session.user.id);
  }

  const record = await prisma.chartAnalysis.create({
    data: {
      userId: session.user.id,
      imageUrl,
      symbol: analysisResult.symbol ?? null,
      timeframe: analysisResult.timeframe ?? null,
      marketBias: analysisResult.marketBias,
      support: JSON.stringify(analysisResult.support),
      resistance: JSON.stringify(analysisResult.resistance),
      entry: analysisResult.entry,
      takeProfit: analysisResult.takeProfit,
      stopLoss: analysisResult.stopLoss,
      takeProfit2: analysisResult.takeProfit2 ?? null,
      stopLoss2: analysisResult.stopLoss2 ?? null,
      riskReward: analysisResult.riskReward,
      confidence: analysisResult.confidence ?? null,
      reasoning: analysisResult.reasoning,
      rawResponse: JSON.stringify(analysisResult),
    },
  });

  if (subscription) {
    const after = await getRemainingUploadsToday(session.user.id);
    return NextResponse.json({
      analysis: {
        id: record.id,
        ...analysisResult,
        imageUrl: record.imageUrl,
        createdAt: record.createdAt.toISOString(),
      },
      creditsRemaining: after?.remaining ?? 0,
      dailyLimit: after?.limit ?? subscription.uploadsPerDay,
    });
  }

  const creditsLeft = await getOrCreateCredits(session.user.id);
  return NextResponse.json({
    analysis: {
      id: record.id,
      ...analysisResult,
      imageUrl: record.imageUrl,
      createdAt: record.createdAt.toISOString(),
    },
    creditsRemaining: creditsLeft,
    dailyLimit: null,
  });
}
