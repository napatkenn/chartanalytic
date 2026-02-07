import { NextResponse } from "next/server";
import { analyzeChartImage } from "@/lib/ai-analysis";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * POST /api/analyze-image
 * For social-agent (or cron): analyze a chart image without auth or credits.
 * Requires: Authorization: Bearer <ANALYZE_IMAGE_SECRET> and FormData with field "chart" (image file).
 * Returns: { analysis: AnalysisResult } — same shape as /api/analyze, no DB save.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.ANALYZE_IMAGE_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
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

  return NextResponse.json({ analysis: analysisResult });
}
