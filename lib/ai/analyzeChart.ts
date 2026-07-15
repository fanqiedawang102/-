import type { AnalysisResponse, MarketOverview, MarketStage, Pattern, PriceLevel, TechnicalIndicators, TrendAnalysis, TradingPlan, VolumeAnalysis } from "@/lib/analysis";
import { formatKnowledgeContext, retrieveKnowledge, type VisionSignals } from "@/lib/rag/knowledge";
import { getMarketData, type MarketData } from "@/lib/market/eastmoney";

type ChartContext = { stockCode: string; market: string; period: string };
type JsonRecord = Record<string, unknown>;
export class ChartAnalysisError extends Error { constructor(message: string, readonly status = 502) { super(message); } }
const MARKET_STAGES = ["上涨趋势初期", "上涨趋势中期", "高位震荡", "下跌趋势", "底部反转", "震荡整理"] as const;
const ANALYSIS_SCHEMA = { type: "object", additionalProperties: false, required: ["market_stage", "market_overview", "technical_indicators", "trend", "patterns", "volume", "support", "resistance", "trading_plan", "risk", "summary"], properties: {
  market_stage: { type: "string", enum: MARKET_STAGES },
  market_overview: { type: "object", additionalProperties: false, required: ["data_source", "current_price", "change_percent", "latest_volume"], properties: { data_source: { type: "string" }, current_price: { type: "string" }, change_percent: { type: "string" }, latest_volume: { type: "string" } } },
  technical_indicators: { type: "object", additionalProperties: false, required: ["ma5", "ma20", "ma60", "macd", "rsi"], properties: { ma5: { type: "string" }, ma20: { type: "string" }, ma60: { type: "string" }, macd: { type: "string" }, rsi: { type: "string" } } },
  trend: { type: "object", additionalProperties: false, required: ["direction", "moving_average", "high_low_structure", "candlestick_arrangement"], properties: { direction: { type: "string" }, moving_average: { type: "string" }, high_low_structure: { type: "string" }, candlestick_arrangement: { type: "string" } } },
  patterns: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "position", "market_meaning", "confidence"], properties: { name: { type: "string" }, position: { type: "string" }, market_meaning: { type: "string" }, confidence: { type: "string" } } } },
  volume: { type: "object", additionalProperties: false, required: ["assessment", "evidence"], properties: { assessment: { type: "string", enum: ["放量上涨", "缩量上涨", "放量下跌", "量价背离", "量能中性", "无法从截图确认"] }, evidence: { type: "string" } } },
  support: { type: "object", additionalProperties: false, required: ["area", "reason"], properties: { area: { type: "string" }, reason: { type: "string" } } },
  resistance: { type: "object", additionalProperties: false, required: ["area", "reason"], properties: { area: { type: "string" }, reason: { type: "string" } } },
  trading_plan: { type: "object", additionalProperties: false, required: ["observation_conditions", "if_breakout", "if_breakdown"], properties: { observation_conditions: { type: "array", items: { type: "string" } }, if_breakout: { type: "string" }, if_breakdown: { type: "string" } } },
  risk: { type: "string" }, summary: { type: "string" }
} } as const;
const SIGNAL_SCHEMA = { type: "object", additionalProperties: false, required: ["patterns", "trend", "volume"], properties: { patterns: { type: "array", items: { type: "string" } }, trend: { type: "string" }, volume: { type: "string" } } } as const;
const SYSTEM_PROMPT = "你是一名拥有多年实战经验的专业技术分析师。请严格基于用户上传的股票K线截图及提供的市场、周期信息，生成技术分析参考。不要臆造图片中不可见的价格、均线、指标数值、日期或成交量；信息不可见时明确写“无法从截图确认”。\n\n分析标准：\n1. 市场阶段只能从：上涨趋势初期、上涨趋势中期、高位震荡、下跌趋势、底部反转、震荡整理 中选择一个最符合当前截图的类别。\n2. 趋势判断必须分别说明均线结构、高低点关系、K线排列。没有均线或完整走势时，说明无法确认，不能补造依据。\n3. 形态需覆盖可识别的单K形态、多K组合和图形结构。每个形态都写名称、出现位置、市场含义、可信度；没有可靠形态时返回空数组。\n4. 成交量分类只能使用：放量上涨、缩量上涨、放量下跌、量价背离、量能中性、无法从截图确认，并写出图中证据。\n5. 支撑和压力必须分别给出区域与原因；截图无法定位具体价位时可用“近期低点区域”等相对描述。\n6. 交易观察计划只能描述观察条件、突破后应关注的确认信号、跌破后的风险位置；不得给出买入、卖出、仓位、止损或收益承诺。\n7. 明确风险和不确定因素：截图范围、指标/成交量可见性、形态未确认等。\n\n禁止预测确定涨跌、给出确定性买卖建议或绝对化措辞。所有输出使用简洁、专业的中文，并严格匹配 JSON Schema。";

export async function analyzeChart(image: File, context: ChartContext): Promise<AnalysisResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new ChartAnalysisError("尚未配置 OpenAI API Key。请在 .env.local 中设置 OPENAI_API_KEY 后重启服务。", 503);
  const marketData = await getMarketData(context.stockCode);
  const imageUrl = `data:${image.type};base64,${Buffer.from(await image.arrayBuffer()).toString("base64")}`;
  const signals = await extractVisionSignals(apiKey, imageUrl, context);
  const knowledgeContext = formatKnowledgeContext(await retrieveKnowledge(signals));
  let response: Response;
  try { response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: "gpt-5.4-mini", instructions: `${SYSTEM_PROMPT}\n\n以下是根据同一张图初步识别的信号检索到的本地技术分析知识。只在与图中证据一致时引用；若知识与图片不符，以图片可见信息为准。\n\n${knowledgeContext}`, input: [{ role: "user", content: [{ type: "input_text", text: `请结合图片、知识库和下列真实行情数据生成最终报告。行情数据是技术指标的唯一数值来源；若未提供股票代码则对应字段写“未提供股票代码，无法获取”。\n${formatMarketData(marketData)}\n初步视觉信号：形态=${signals.patterns.join("、") || "未识别"}；趋势=${signals.trend}；成交量=${signals.volume}。` }, { type: "input_image", image_url: imageUrl, detail: "high" }] }], text: { format: { type: "json_schema", name: "professional_chart_analysis", strict: true, schema: ANALYSIS_SCHEMA } } }) }); }
  catch { throw new ChartAnalysisError("无法连接 AI 分析服务，请检查网络后重试。", 502); }
  const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  if (!response.ok) { if (response.status === 401) throw new ChartAnalysisError("OpenAI API Key 无效或无权访问，请检查 .env.local 配置。", 502); if (response.status === 429) throw new ChartAnalysisError("AI 分析服务当前繁忙或额度不足，请稍后重试。", 429); throw new ChartAnalysisError("AI 分析服务暂时不可用，请稍后重试。", 502); }
  const outputText = extractOutputText(payload);
  if (!outputText) throw new ChartAnalysisError("AI 未能识别这张图片，请上传更清晰、完整的K线截图后重试。", 422);
  try { return validateAnalysis(JSON.parse(outputText)); } catch { throw new ChartAnalysisError("AI 返回的分析格式异常，请重新尝试。", 502); }
}

async function extractVisionSignals(apiKey: string, imageUrl: string, context: ChartContext): Promise<VisionSignals> {
  let response: Response;
  try { response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: "gpt-5.4-mini", instructions: "你是K线视觉识别模块。只提取图片中可见的形态关键词、趋势描述和成交量描述，不给交易建议，不臆造不可见指标。形态关键词优先使用英文标准词：hammer、shooting_star、bullish_engulfing、bearish_engulfing、double_bottom、double_top、triangle、flag；没有可靠形态则返回空数组。", input: [{ role: "user", content: [{ type: "input_text", text: `识别这张K线图的检索信号。市场：${context.market || "未提供"}；周期：${context.period || "未提供"}。` }, { type: "input_image", image_url: imageUrl, detail: "high" }] }], text: { format: { type: "json_schema", name: "chart_retrieval_signals", strict: true, schema: SIGNAL_SCHEMA } } }) }); }
  catch { throw new ChartAnalysisError("无法连接 AI 分析服务，请检查网络后重试。", 502); }
  const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  if (!response.ok) throw new ChartAnalysisError("AI 无法完成K线视觉识别，请稍后重试。", response.status === 429 ? 429 : 502);
  const outputText = extractOutputText(payload);
  if (!outputText) throw new ChartAnalysisError("AI 未能从截图中提取分析信号，请上传更清晰的K线图后重试。", 422);
  try {
    const result = JSON.parse(outputText) as VisionSignals;
    if (!Array.isArray(result.patterns) || typeof result.trend !== "string" || typeof result.volume !== "string" || !result.patterns.every((pattern) => typeof pattern === "string")) throw new Error("Invalid signals");
    return result;
  } catch { throw new ChartAnalysisError("AI 视觉识别结果格式异常，请重新尝试。", 502); }
}

function extractOutputText(payload: { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }): string | undefined { return payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text; }

function isRecord(value: unknown): value is JsonRecord { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function stringField(value: JsonRecord, key: string): string { if (typeof value[key] !== "string") throw new Error("Invalid analysis"); return value[key]; }
function priceLevel(value: unknown): PriceLevel { if (!isRecord(value)) throw new Error("Invalid price level"); return { area: stringField(value, "area"), reason: stringField(value, "reason") }; }
function marketOverview(value: unknown): MarketOverview { if (!isRecord(value)) throw new Error("Invalid market overview"); return { data_source: stringField(value, "data_source"), current_price: stringField(value, "current_price"), change_percent: stringField(value, "change_percent"), latest_volume: stringField(value, "latest_volume") }; }
function technicalIndicators(value: unknown): TechnicalIndicators { if (!isRecord(value)) throw new Error("Invalid indicators"); return { ma5: stringField(value, "ma5"), ma20: stringField(value, "ma20"), ma60: stringField(value, "ma60"), macd: stringField(value, "macd"), rsi: stringField(value, "rsi") }; }
function validateAnalysis(value: unknown): AnalysisResponse {
  if (!isRecord(value)) throw new Error("Invalid analysis"); const marketStage = stringField(value, "market_stage");
  if (!MARKET_STAGES.includes(marketStage as MarketStage) || !isRecord(value.trend) || !isRecord(value.volume) || !isRecord(value.trading_plan) || !Array.isArray(value.patterns)) throw new Error("Invalid analysis");
  const trend: TrendAnalysis = { direction: stringField(value.trend, "direction"), moving_average: stringField(value.trend, "moving_average"), high_low_structure: stringField(value.trend, "high_low_structure"), candlestick_arrangement: stringField(value.trend, "candlestick_arrangement") };
  const volume: VolumeAnalysis = { assessment: stringField(value.volume, "assessment"), evidence: stringField(value.volume, "evidence") };
  const tradingPlan: TradingPlan = { observation_conditions: value.trading_plan.observation_conditions as string[], if_breakout: stringField(value.trading_plan, "if_breakout"), if_breakdown: stringField(value.trading_plan, "if_breakdown") };
  if (!Array.isArray(tradingPlan.observation_conditions) || !tradingPlan.observation_conditions.every((condition) => typeof condition === "string")) throw new Error("Invalid trading plan");
  const patterns: Pattern[] = value.patterns.map((item) => { if (!isRecord(item)) throw new Error("Invalid pattern"); return { name: stringField(item, "name"), position: stringField(item, "position"), market_meaning: stringField(item, "market_meaning"), confidence: stringField(item, "confidence") }; });
  return { market_stage: marketStage as MarketStage, market_overview: marketOverview(value.market_overview), technical_indicators: technicalIndicators(value.technical_indicators), trend, patterns, volume, support: priceLevel(value.support), resistance: priceLevel(value.resistance), trading_plan: tradingPlan, risk: stringField(value, "risk"), summary: stringField(value, "summary") };
}

function formatMarketData(data: MarketData | null): string {
  if (!data) return "行情暂时不可用。不要推测当前价格、涨跌幅、成交量或技术指标；相关报告字段写“行情暂时不可用”。";
  const indicators = calculateIndicators(data.kline.map((candle) => candle.close));
  return `数据源：东方财富；代码：${data.symbol}；当前价格：${data.price}；涨跌幅：${data.change}；最新成交量：${data.volume}；成交额：${data.amount}；最近K线数量：${data.kline.length}；MA5：${indicators.ma5}；MA20：${indicators.ma20}；MA60：${indicators.ma60}；MACD：${indicators.macd}；RSI：${indicators.rsi}。`;
}

function calculateIndicators(closes: number[]): { ma5: string; ma20: string; ma60: string; macd: string; rsi: string } {
  const average = (length: number) => closes.length >= length ? (closes.slice(-length).reduce((sum, value) => sum + value, 0) / length).toFixed(2) : "数据不足";
  const ema = (period: number) => closes.reduce<number[]>((values, value, index) => [...values, index === 0 ? value : value * (2 / (period + 1)) + values[index - 1] * (1 - 2 / (period + 1))], []);
  const macd = closes.length >= 26 ? (ema(12).at(-1)! - ema(26).at(-1)!).toFixed(2) : "数据不足";
  if (closes.length <= 14) return { ma5: average(5), ma20: average(20), ma60: average(60), macd, rsi: "数据不足" };
  const changes = closes.slice(1).map((value, index) => value - closes[index]).slice(-14);
  const gains = changes.map((value) => Math.max(value, 0)).reduce((sum, value) => sum + value, 0) / 14;
  const losses = changes.map((value) => Math.max(-value, 0)).reduce((sum, value) => sum + value, 0) / 14;
  const rsi = losses === 0 ? "100.00" : (100 - 100 / (1 + gains / losses)).toFixed(2);
  return { ma5: average(5), ma20: average(20), ma60: average(60), macd, rsi };
}
