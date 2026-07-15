import { NextResponse } from "next/server";
import { analyzeChart, ChartAnalysisError } from "@/lib/ai/analyzeChart";

const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData();
  const image = formData.get("image");
  if (!(image instanceof File)) return NextResponse.json({ error: "请上传一张K线图片。" }, { status: 400 });
  if (!ACCEPTED_TYPES.has(image.type)) return NextResponse.json({ error: "仅支持 PNG、JPG 或 WEBP 图片。" }, { status: 400 });
  if (image.size > MAX_FILE_SIZE) return NextResponse.json({ error: "图片大小不能超过 10MB。" }, { status: 400 });

  try {
    const result = await analyzeChart(image, {
      stockCode: String(formData.get("stockCode") || ""),
      market: String(formData.get("market") || ""),
      period: String(formData.get("period") || "")
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/analyze] analysis failed", { stockCode: String(formData.get("stockCode") || ""), market: String(formData.get("market") || ""), error: error instanceof Error ? error.message : String(error) });
    if (error instanceof ChartAnalysisError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "分析服务发生未知错误，请稍后重试。" }, { status: 500 });
  }
}
