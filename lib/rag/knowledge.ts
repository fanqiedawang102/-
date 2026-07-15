import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type VisionSignals = { patterns: string[]; trend: string; volume: string };
export type KnowledgeDocument = { id: string; content: string };

const DOCUMENTS = [
  { id: "hammer", file: "candlestick/hammer.md", terms: ["hammer", "锤头"] },
  { id: "shooting_star", file: "candlestick/shooting_star.md", terms: ["shooting star", "shooting_star", "射击之星"] },
  { id: "bullish_engulfing", file: "candlestick/bullish_engulfing.md", terms: ["bullish engulfing", "bullish_engulfing", "看涨吞没"] },
  { id: "bearish_engulfing", file: "candlestick/bearish_engulfing.md", terms: ["bearish engulfing", "bearish_engulfing", "看跌吞没"] },
  { id: "double_bottom", file: "patterns/double_bottom.md", terms: ["double bottom", "double_bottom", "双底"] },
  { id: "double_top", file: "patterns/double_top.md", terms: ["double top", "double_top", "双顶"] },
  { id: "triangle", file: "patterns/triangle.md", terms: ["triangle", "三角形"] },
  { id: "flag", file: "patterns/flag.md", terms: ["flag", "旗形"] },
  { id: "macd", file: "indicators/macd.md", terms: ["macd"] },
  { id: "rsi", file: "indicators/rsi.md", terms: ["rsi"] },
  { id: "moving_average", file: "indicators/moving_average.md", terms: ["moving average", "moving_average", "均线", "ma"] },
  { id: "volume_price", file: "volume/volume_price.md", terms: ["volume", "成交量", "放量", "缩量", "量价", "背离"] }
] as const;

export async function retrieveKnowledge(signals: VisionSignals): Promise<KnowledgeDocument[]> {
  const query = [...signals.patterns, signals.trend, signals.volume].join(" ").toLowerCase();
  const matches = DOCUMENTS.filter((document) => document.terms.some((term) => query.includes(term.toLowerCase())));
  const selected = matches.length ? matches : DOCUMENTS.filter((document) => document.id === "moving_average" || document.id === "volume_price");
  return Promise.all(selected.map(async (document) => ({ id: document.id, content: await readFile(path.join(process.cwd(), "knowledge", document.file), "utf8") })));
}

export function formatKnowledgeContext(documents: KnowledgeDocument[]): string {
  return documents.map((document) => `【知识库：${document.id}】\n${document.content}`).join("\n\n");
}
