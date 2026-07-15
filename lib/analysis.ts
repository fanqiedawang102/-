export type MarketStage = "上涨趋势初期" | "上涨趋势中期" | "高位震荡" | "下跌趋势" | "底部反转" | "震荡整理";

export type TrendAnalysis = { direction: string; moving_average: string; high_low_structure: string; candlestick_arrangement: string };
export type Pattern = { name: string; position: string; market_meaning: string; confidence: string };
export type PriceLevel = { area: string; reason: string };
export type VolumeAnalysis = { assessment: string; evidence: string };
export type TradingPlan = { observation_conditions: string[]; if_breakout: string; if_breakdown: string };
export type MarketOverview = { data_source: string; current_price: string; change_percent: string; latest_volume: string };
export type TechnicalIndicators = { ma5: string; ma20: string; ma60: string; macd: string; rsi: string };

export type AnalysisResponse = {
  market_stage: MarketStage;
  market_overview: MarketOverview;
  technical_indicators: TechnicalIndicators;
  trend: TrendAnalysis;
  patterns: Pattern[];
  volume: VolumeAnalysis;
  support: PriceLevel;
  resistance: PriceLevel;
  trading_plan: TradingPlan;
  risk: string;
  summary: string;
};
