import "server-only";

import { fetchProviderText, formatPercent, formatPrice, MarketProviderError, normalizeAStockCode, numberValue, type Kline, type MarketData, type MarketProvider } from "../types";

export const tencentProvider: MarketProvider = {
  name: "Tencent",
  async getMarketData(stockCode): Promise<MarketData> {
    const { symbol } = normalizeAStockCode(stockCode);
    const headers = { Referer: "https://gu.qq.com/", "User-Agent": "AI-Chart-Analyst/1.0" };
    const [quoteText, klineText] = await Promise.all([
      fetchProviderText(`https://qt.gtimg.cn/q=${symbol}`, "Tencent quote", headers),
      fetchProviderText(`https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${symbol},day,,,100,qfq`, "Tencent kline", headers),
    ]);
    const payload = quoteText.match(/="([^"]*)"/)?.[1];
    const fields = payload?.split("~") ?? [];
    const current = numberValue(fields[3]);
    const previous = numberValue(fields[4]);
    const volume = numberValue(fields[6]);
    if (current === null || previous === null || volume === null) throw new MarketProviderError("Tencent", "报价字段缺失");
    const kline = parseKlines(klineText, symbol);
    if (!kline.length) throw new MarketProviderError("Tencent", "日K数据为空");
    return {
      symbol,
      price: formatPrice(current),
      change: formatPercent(current, previous),
      volume: String(volume),
      amount: String(numberValue(fields[37]) ?? 0),
      kline,
      source: "腾讯财经",
    };
  },
};

function parseKlines(text: string, symbol: string): Kline[] {
  const response = JSON.parse(text) as { data?: Record<string, { qfqday?: unknown[] }> };
  const rows = response.data?.[symbol]?.qfqday;
  if (!Array.isArray(rows)) return [];
  return rows.slice(-100).flatMap((row) => {
    if (!Array.isArray(row)) return [];
    const [date, open, close, high, low, volume] = row;
    const candle = { date: String(date), open: Number(open), close: Number(close), high: Number(high), low: Number(low), volume: Number(volume), amount: 0 };
    return Number.isFinite(candle.open) && Number.isFinite(candle.close) && Number.isFinite(candle.high) && Number.isFinite(candle.low) && Number.isFinite(candle.volume) ? [candle] : [];
  });
}
