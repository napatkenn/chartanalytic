import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { authOptions } from "@/lib/auth";
import {
  getActiveSubscription,
  getRemainingUploadsToday,
} from "@/lib/subscription";
import { getOrCreateCredits, consumeCredit } from "@/lib/credits";
import { analyzeChartImage } from "@/lib/ai-analysis";
import { saveUpload } from "@/lib/storage";
import { prisma } from "@/lib/db";
import type { AnalysisOptions } from "@/lib/analysis-types";
import { DEFAULT_ANALYSIS_OPTIONS } from "@/lib/analysis-types";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
/** Resize for OpenAI vision to reduce payload and avoid timeout (max long edge). */
const ANALYSIS_MAX_PX = 1536;

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

  const parseNum = (v: FormDataEntryValue | null, defaultVal: 1 | 2): 1 | 2 => {
    if (v === "1") return 1;
    if (v === "2") return 2;
    return defaultVal;
  };
  const isSubscribed = !!subscription;
  let analysisOptions: AnalysisOptions = {
    ...DEFAULT_ANALYSIS_OPTIONS,
    numTp: parseNum(formData.get("numTp"), 1),
    numSl: parseNum(formData.get("numSl"), 1),
    includeConfidence: formData.get("includeConfidence") !== "false",
    includeRiskReward: formData.get("includeRiskReward") !== "false",
    extendedReasoning: formData.get("extendedReasoning") === "true",
  };
  // Subscriber-only: 2 TP, 2 SL, extended reasoning
  if (!isSubscribed) {
    analysisOptions = {
      ...analysisOptions,
      numTp: 1,
      numSl: 1,
      extendedReasoning: false,
    };
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

  // Resize for analysis to speed up OpenAI (skip if sharp fails or hangs — avoid blocking)
  const SHARP_TIMEOUT_MS = 15_000;
  let analysisBuffer: Buffer = buffer;
  try {
    const resizePromise = (async () => {
      const meta = await sharp(buffer).metadata();
      const w = meta.width ?? 0;
      const h = meta.height ?? 0;
      if (w <= ANALYSIS_MAX_PX && h <= ANALYSIS_MAX_PX) return buffer;
      return sharp(buffer)
        .resize(ANALYSIS_MAX_PX, ANALYSIS_MAX_PX, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    })();
    analysisBuffer = await Promise.race([
      resizePromise,
      new Promise<Buffer>((_, reject) => setTimeout(() => reject(new Error("resize_timeout")), SHARP_TIMEOUT_MS)),
    ]);
  } catch {
    analysisBuffer = buffer;
  }
  const base64 = analysisBuffer.toString("base64");
  const mime = analysisBuffer === buffer ? file.type : "image/jpeg";
  const dataUrl = `data:${mime};base64,${base64}`;

  let analysisResult;
  try {
    analysisResult = await analyzeChartImage(dataUrl, analysisOptions);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analysis failed";
    const isTimeout = message.includes("timed out");
    return NextResponse.json(
      { error: isTimeout ? message : `AI analysis failed: ${message}` },
      { status: isTimeout ? 504 : 502 }
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
