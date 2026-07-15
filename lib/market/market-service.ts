import "server-only";

import { eastmoneyProvider } from "./providers/eastmoney";
import { sinaProvider } from "./providers/sina";
import { tencentProvider } from "./providers/tencent";
import type { MarketData, MarketProvider } from "./types";

const providers: MarketProvider[] = [eastmoneyProvider, tencentProvider, sinaProvider];

export async function getMarketData(stockCode: string): Promise<MarketData | null> {
  if (!stockCode.trim()) return null;
  for (const provider of providers) {
    console.info(`[market] Trying ${provider.name}`, { stockCode });
    try {
      const data = await provider.getMarketData(stockCode);
      console.info(`[market] ${provider.name} success`, { stockCode });
      return data;
    } catch (error) {
      console.warn(`[market] ${provider.name} failed`, { stockCode, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  console.error("[market] All providers failed", { stockCode });
  return null;
}
