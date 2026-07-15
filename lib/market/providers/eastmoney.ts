import "server-only";

import { fetchProviderText, formatPrice, MarketProviderError, normalizeAStockCode, type Kline, type MarketData, type MarketProvider } from "../types";

const QUOTE_FIELDS = "f43,f47,f48,f57,f170";
const KLINE_FIELDS = "f51,f52,f53,f54,f55,f56";

export const eastmoneyProvider: MarketProvider = {
  name: "Eastmoney",
  async getMarketData(stockCode) {
    const { symbol, secid } = normalizeAStockCode(stockCode);
    const headers = { Referer: "https://quote.eastmoney.com/", "User-Agent": "AI-Chart-Analyst/1.0" };
    const quoteUrl = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=${QUOTE_FIELDS}`;
    const klineUrl = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&klt=101&fqt=1&lmt=100&end=20500101&fields1=f1,f2,f3,f4,f5,f6&fields2=${KLINE_FIELDS}`;
    const [quoteText, klineText] = await Promise.all([
      fetchProviderText(quoteUrl, "Eastmoney quote", headers),
      fetchProviderText(klineUrl, "Eastmoney kline", headers),
    ]);
    const quote = JSON.parse(quoteText) as { data?: { f43?: number; f47?: number; f48?: number; f170?: number } };
    const klineResponse = JSON.parse(klineText) as { data?: { klines?: string[] } };
    if (!quote.data || typeof quote.data.f43 !== "number" || typeof quote.data.f170 !== "number") throw new MarketProviderError("Eastmoney", "报价字段缺失");
    const kline = parseKlines(klineResponse.data?.klines);
    if (!kline.length) throw new MarketProviderError("Eastmoney", "日K数据为空");
    return {
      symbol,
      price: formatPrice(quote.data.f43 / 100),
      change: `${(quote.data.f170 / 100).toFixed(2)}%`,
      volume: String(quote.data.f47 ?? 0),
      amount: String(quote.data.f48 ?? 0),
      kline,
      source: "东方财富",
    };
  },
};

function parseKlines(lines: string[] | undefined): Kline[] {
  return (lines ?? []).map((line) => {
    const [date, open, close, high, low, volume, amount] = line.split(",");
    return { date, open: Number(open), close: Number(close), high: Number(high), low: Number(low), volume: Number(volume), amount: Number(amount) };
  }).filter((candle) => Number.isFinite(candle.close));
}
