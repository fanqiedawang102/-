import { NextRequest, NextResponse } from "next/server";
import { getMarketData } from "@/lib/market/eastmoney";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const stockCode = request.nextUrl.searchParams.get("stockCode")?.trim() ?? "";
  if (!/^\d{6}$/.test(stockCode)) return unavailableResponse("请输入 6 位 A 股代码。");
  const data = await getMarketData(stockCode);
  if (!data) return unavailableResponse("实时行情暂不可用。");
  return NextResponse.json({ available: true, data });
}

function unavailableResponse(message: string) {
  return NextResponse.json({ available: false, price: null, change: null, volume: null, message });
}
