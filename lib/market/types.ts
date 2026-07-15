import "server-only";

export type StockQuote = {
  symbol: string;
  price: string;
  change: string;
  volume: string;
  amount: string;
};

export type Kline = {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  amount: number;
};

export type MarketData = StockQuote & {
  kline: Kline[];
  source: string;
};

export interface MarketProvider {
  readonly name: string;
  getMarketData(stockCode: string): Promise<MarketData>;
}

export class MarketProviderError extends Error {
  constructor(provider: string, reason: string) {
    super(`${provider}: ${reason}`);
    this.name = "MarketProviderError";
  }
}

export function normalizeAStockCode(stockCode: string): { code: string; symbol: string; secid: string } {
  const code = stockCode.trim().replace(/^(sh|sz)/i, "");
  if (!/^\d{6}$/.test(code)) throw new MarketProviderError("market", "股票代码必须是 6 位 A 股代码");
  const isShanghai = code.startsWith("6");
  return { code, symbol: `${isShanghai ? "sh" : "sz"}${code}`, secid: `${isShanghai ? "1" : "0"}.${code}` };
}

export async function fetchProviderText(url: string, provider: string, headers: HeadersInit = {}): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_000);
  try {
    const response = await fetch(url, { headers, signal: controller.signal, cache: "no-store" });
    const text = await response.text();
    if (!response.ok) throw new MarketProviderError(provider, `HTTP ${response.status}`);
    return text;
  } catch (error) {
    if (controller.signal.aborted) throw new MarketProviderError(provider, "timeout");
    if (error instanceof MarketProviderError) throw error;
    throw new MarketProviderError(provider, error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(timeout);
  }
}

export function numberValue(value: string | number | undefined): number | null {
  if (typeof value === "string" && !value.trim()) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatPrice(value: number): string {
  return value.toFixed(2);
}

export function formatPercent(current: number, previous: number): string {
  if (previous === 0) throw new MarketProviderError("market", "昨收价格无效");
  return `${(((current - previous) / previous) * 100).toFixed(2)}%`;
}
