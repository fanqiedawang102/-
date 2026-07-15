import "server-only";

import { fetchProviderText, formatPercent, formatPrice, MarketProviderError, normalizeAStockCode, numberValue, type MarketData, type MarketProvider } from "../types";

export const tencentProvider: MarketProvider = {
  name: "Tencent",
  async getMarketData(stockCode): Promise<MarketData> {
    const { symbol } = normalizeAStockCode(stockCode);
    const text = await fetchProviderText(`https://qt.gtimg.cn/q=${symbol}`, "Tencent", { Referer: "https://gu.qq.com/", "User-Agent": "AI-Chart-Analyst/1.0" });
    const payload = text.match(/="([^"]*)"/)?.[1];
    const fields = payload?.split("~") ?? [];
    const current = numberValue(fields[3]);
    const previous = numberValue(fields[4]);
    const volume = numberValue(fields[6]);
    if (current === null || previous === null || volume === null) throw new MarketProviderError("Tencent", "报价字段缺失");
    return {
      symbol,
      price: formatPrice(current),
      change: formatPercent(current, previous),
      volume: String(volume),
      amount: String(numberValue(fields[37]) ?? 0),
      kline: [],
      source: "腾讯财经",
    };
  },
};
