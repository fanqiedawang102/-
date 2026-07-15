import "server-only";

import { fetchProviderText, formatPercent, formatPrice, MarketProviderError, normalizeAStockCode, numberValue, type MarketData, type MarketProvider } from "../types";

export const sinaProvider: MarketProvider = {
  name: "Sina",
  async getMarketData(stockCode): Promise<MarketData> {
    const { symbol } = normalizeAStockCode(stockCode);
    const text = await fetchProviderText(`https://hq.sinajs.cn/list=${symbol}`, "Sina", { Referer: "https://finance.sina.com.cn/", "User-Agent": "AI-Chart-Analyst/1.0" });
    const payload = text.match(/="([^"]*)"/)?.[1];
    const fields = payload?.split(",") ?? [];
    const previous = numberValue(fields[2]);
    const current = numberValue(fields[3]);
    const volume = numberValue(fields[8]);
    if (current === null || previous === null || volume === null) throw new MarketProviderError("Sina", "报价字段缺失");
    return {
      symbol,
      price: formatPrice(current),
      change: formatPercent(current, previous),
      volume: String(volume),
      amount: String(numberValue(fields[9]) ?? 0),
      kline: [],
      source: "新浪财经",
    };
  },
};
