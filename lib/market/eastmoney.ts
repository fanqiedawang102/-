import "server-only";

export type StockQuote = { symbol: string; price: string; change: string; volume: string; amount: string };
export type Kline = { date: string; open: number; close: number; high: number; low: number; volume: number; amount: number };
export type MarketData = StockQuote & { kline: Kline[] };

const QUOTE_FIELDS = "f43,f47,f48,f57,f170";
const KLINE_FIELDS = "f51,f52,f53,f54,f55,f56";

export async function getStockQuote(stockCode: string): Promise<StockQuote> {
  const { symbol, secid } = normalizeStockCode(stockCode);
  const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=${QUOTE_FIELDS}`;
  const data = await requestEastmoney<{ data?: { f43?: number; f47?: number; f48?: number; f57?: string; f170?: number } }>(url, stockCode, "quote");
  if (!data.data || typeof data.data.f43 !== "number") throw new EastmoneyError("东方财富报价响应缺少价格字段。");
  return { symbol, price: formatPrice(data.data.f43), change: formatPercent(data.data.f170), volume: String(data.data.f47 ?? 0), amount: String(data.data.f48 ?? 0) };
}

export async function getKlineData(stockCode: string): Promise<Kline[]> {
  const { secid } = normalizeStockCode(stockCode);
  const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&klt=101&fqt=1&lmt=100&end=20500101&fields1=f1,f2,f3,f4,f5,f6&fields2=${KLINE_FIELDS}`;
  const data = await requestEastmoney<{ data?: { klines?: string[] } }>(url, stockCode, "kline");
  const klines = data.data?.klines;
  if (!klines?.length) throw new EastmoneyError("东方财富K线响应为空。");
  return klines.map((line) => {
    const [date, open, close, high, low, volume, amount] = line.split(",");
    return { date, open: Number(open), close: Number(close), high: Number(high), low: Number(low), volume: Number(volume), amount: Number(amount) };
  }).filter((candle) => Number.isFinite(candle.close));
}

export async function getMarketData(stockCode: string): Promise<MarketData | null> {
  if (!stockCode.trim()) return null;
  try {
    const [quote, kline] = await Promise.all([getStockQuote(stockCode), getKlineData(stockCode)]);
    return { ...quote, kline };
  } catch (error) {
    console.error("[market] Eastmoney unavailable", { stockCode, error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

function normalizeStockCode(stockCode: string): { symbol: string; secid: string } {
  const code = stockCode.trim().replace(/^(sh|sz)/i, "");
  if (!/^\d{6}$/.test(code)) throw new EastmoneyError("A股股票代码应为 6 位数字。");
  const isShanghai = code.startsWith("6");
  return { symbol: `${isShanghai ? "sh" : "sz"}${code}`, secid: `${isShanghai ? "1" : "0"}.${code}` };
}

async function requestEastmoney<T>(url: string, stockCode: string, operation: string): Promise<T> {
  console.info("[market] Eastmoney request", { operation, stockCode, url });
  let response: Response;
  try { response = await fetch(url, { headers: { Referer: "https://quote.eastmoney.com/", "User-Agent": "AI-Chart-Analyst/1.0" }, cache: "no-store" }); }
  catch (error) { throw new EastmoneyError(`网络请求失败：${error instanceof Error ? error.message : String(error)}`); }
  const responseText = await response.text();
  if (!response.ok) { console.error("[market] Eastmoney HTTP error", { operation, stockCode, url, status: response.status, response: responseText.slice(0, 300) }); throw new EastmoneyError(`HTTP ${response.status}`); }
  try { return JSON.parse(responseText) as T; }
  catch { console.error("[market] Eastmoney parse error", { operation, stockCode, url, status: response.status, response: responseText.slice(0, 300) }); throw new EastmoneyError("接口返回格式无法解析。"); }
}

function formatPrice(value: number | undefined): string { return typeof value === "number" ? (value / 100).toFixed(2) : "行情暂时不可用"; }
function formatPercent(value: number | undefined): string { return typeof value === "number" ? `${(value / 100).toFixed(2)}%` : "行情暂时不可用"; }
class EastmoneyError extends Error {}
