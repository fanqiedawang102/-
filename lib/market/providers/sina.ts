import "server-only";

import { fetchProviderText, formatPercent, formatPrice, MarketProviderError, normalizeAStockCode, numberValue, type Kline, type MarketData, type MarketProvider } from "../types";

export const sinaProvider: MarketProvider = {
  name: "Sina",
  async getMarketData(stockCode): Promise<MarketData> {
    const { symbol } = normalizeAStockCode(stockCode);
    const headers = { Referer: "https://finance.sina.com.cn/", "User-Agent": "AI-Chart-Analyst/1.0" };
    const [quoteText, klineText] = await Promise.all([
      fetchProviderText(`https://hq.sinajs.cn/list=${symbol}`, "Sina quote", headers),
      fetchProviderText(`https://quotes.sina.cn/cn/api/jsonp_v2.php/var%20kline=/CN_MarketDataService.getKLineData?symbol=${symbol}&scale=240&ma=no&datalen=100`, "Sina kline", headers),
    ]);
    const payload = quoteText.match(/="([^"]*)"/)?.[1];
    const fields = payload?.split(",") ?? [];
    const previous = numberValue(fields[2]);
    const current = numberValue(fields[3]);
    const volume = numberValue(fields[8]);
    if (current === null || previous === null || volume === null) throw new MarketProviderError("Sina", "报价字段缺失");
    const kline = parseKlines(klineText);
    if (!kline.length) throw new MarketProviderError("Sina", "日K数据为空");
    return {
      symbol,
      price: formatPrice(current),
      change: formatPercent(current, previous),
      volume: String(volume),
      amount: String(numberValue(fields[9]) ?? 0),
      kline,
      source: "新浪财经",
    };
  },
};

function parseKlines(text: string): Kline[] {
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd < jsonStart) return [];
  const response = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as { result?: { data?: Array<{ day?: string; open?: string; high?: string; low?: string; close?: string; volume?: string }> } };
  return (response.result?.data ?? []).slice(-100).flatMap((row) => {
    const candle = { date: row.day ?? "", open: Number(row.open), close: Number(row.close), high: Number(row.high), low: Number(row.low), volume: Number(row.volume), amount: 0 };
    return candle.date && Number.isFinite(candle.open) && Number.isFinite(candle.close) && Number.isFinite(candle.high) && Number.isFinite(candle.low) && Number.isFinite(candle.volume) ? [candle] : [];
  });
}
