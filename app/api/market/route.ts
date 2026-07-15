import { NextRequest, NextResponse } from "next/server";
import { getMarketData } from "@/lib/market/eastmoney";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const stockCode = request.nextUrl.searchParams.get("stockCode")?.trim() ?? "";
  if (!/^\d{6}$/.test(stockCode)) return NextResponse.json({ available: false, message: "请输入 6 位 A 股代码。" }, { status: 400 });
  const data = await getMarketData(stockCode);
  if (!data) return NextResponse.json({ available: false, message: "行情暂时不可用。" }, { status: 503 });
  return NextResponse.json({ available: true, data });
}
