"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AnalysisResponse } from "@/lib/analysis";
import { loadAnalysisImage } from "@/lib/image-store";

type SavedAnalysis = { result: AnalysisResponse; stockCode: string; market: string; period: string };

export default function AnalysisPage() {
  const [analysis, setAnalysis] = useState<SavedAnalysis | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageUnavailable, setImageUnavailable] = useState(false);
  useEffect(() => {
    const saved = sessionStorage.getItem("chart-analysis"); if (saved) setAnalysis(JSON.parse(saved));
    let url: string | null = null; let cancelled = false;
    loadAnalysisImage().then((image) => { if (!image) { if (!cancelled) setImageUnavailable(true); return; } url = URL.createObjectURL(image); if (!cancelled) setImageUrl(url); }).catch(() => { if (!cancelled) setImageUnavailable(true); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, []);
  if (!analysis) return <main className="grid min-h-screen place-items-center p-6 text-center"><div><p className="text-lg font-semibold">没有可展示的分析结果</p><Link href="/" className="mt-4 inline-block font-semibold text-[#177a53]">返回上传图片 →</Link></div></main>;

  const { result, stockCode, market, period } = analysis;
  const outlook = getOutlook(result);
  const currentPrice = parseNumber(result.market_overview.current_price);
  const supportPrice = parseNumber(result.support.area);
  const resistancePrice = parseNumber(result.resistance.area);
  const observationConditions = result.trading_plan?.observation_conditions ?? [];

  return <main className="min-h-screen bg-[#f4f7f3] px-5 py-7 sm:px-8 lg:px-12"><div className="mx-auto max-w-6xl">
    <header className="mb-7 flex items-center justify-between"><Link href="/" className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#177a53] text-lg text-white">⌁</div><span className="text-sm font-bold tracking-wide">AI CHART ANALYST</span></Link><Link href="/" className="rounded-lg px-3 py-2 text-sm font-semibold text-[#177a53] hover:bg-emerald-50">分析另一张图</Link></header>
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold text-[#177a53]">AI 视觉分析报告</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">{stockCode || "未填写代码"} · {period}</h1><p className="mt-1 text-sm text-[#64736e]">{market} · 仅供技术分析参考</p></div></div>

    <section className={`mb-5 overflow-hidden rounded-3xl border p-5 sm:p-6 ${outlook.tone.card}`}><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className={`text-sm font-semibold ${outlook.tone.text}`}>AI 综合判断</p><h2 className="mt-1 text-2xl font-bold">{outlook.icon} {outlook.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#42534c]">{shortText(result.summary, 92)}</p></div><div className="grid grid-cols-3 gap-2 sm:min-w-[340px]"><Score label="当前趋势" value={result.market_stage} tone={outlook.tone} /><Score label="短线评级" value={outlook.rating} tone={outlook.tone} /><Score label="风险等级" value={outlook.risk} tone={outlook.riskTone} /></div></div></section>

    <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]"><aside className="space-y-4 lg:sticky lg:top-6 lg:self-start"><div className="overflow-hidden rounded-3xl border border-[#d9e3dc] bg-white p-4">{imageUrl ? <img src={imageUrl} alt="用于分析的K线图" className="h-64 w-full rounded-2xl bg-[#f4f7f3] object-contain" /> : <div className="grid h-64 place-items-center rounded-2xl bg-[#f4f7f3] px-5 text-center text-sm text-[#64736e]">{imageUnavailable ? "未找到本次分析的图片。请返回后重新上传。" : "正在恢复已上传的K线图…"}</div>}<p className="mt-3 text-xs leading-5 text-[#64736e]">图片识别结果已结合东方财富行情与本地技术知识库。</p></div><CompactCard title="行情快照"><div className="grid grid-cols-3 gap-2"><MiniStat label="现价" value={result.market_overview.current_price} /><MiniStat label="涨跌幅" value={result.market_overview.change_percent} accent /><MiniStat label="成交量" value={compactNumber(result.market_overview.latest_volume)} /></div><p className="mt-3 text-xs text-[#64736e]">数据源：{result.market_overview.data_source}</p></CompactCard></aside>

      <div className="space-y-5">
        <section className="grid gap-5 md:grid-cols-2"><CompactCard title="趋势依据" icon="↗"><SignalRow label="均线" value={shortText(result.trend.moving_average, 48)} /><SignalRow label="高低点" value={shortText(result.trend.high_low_structure, 48)} /><SignalRow label="K线排列" value={shortText(result.trend.candlestick_arrangement, 48)} /></CompactCard><CompactCard title="量价状态" icon="▥"><p className={`text-lg font-bold ${volumeTone(result.volume.assessment)}`}>{result.volume.assessment}</p><p className="mt-2 text-sm leading-6 text-[#64736e]">{shortText(result.volume.evidence, 74)}</p></CompactCard></section>

        <CompactCard title="关键价格区间" icon="⌁"><div className="mb-4 flex items-center justify-between text-sm"><span className="font-semibold text-[#177a53]">支撑 · {result.support.area}</span><span className="font-semibold text-[#a34a34]">压力 · {result.resistance.area}</span></div><PriceRange current={currentPrice} support={supportPrice} resistance={resistancePrice} /><div className="mt-4 grid gap-3 sm:grid-cols-2"><Reason label="支撑依据" text={shortText(result.support.reason, 64)} tone="support" /><Reason label="压力依据" text={shortText(result.resistance.reason, 64)} tone="resistance" /></div></CompactCard>

        <CompactCard title="技术指标怎么读" icon="◌"><div className="grid gap-3 sm:grid-cols-3"><Indicator label="MA 均线" value={`5 / 20 / 60：${result.technical_indicators.ma5} / ${result.technical_indicators.ma20} / ${result.technical_indicators.ma60}`} hint={maHint(currentPrice, result.technical_indicators.ma5, result.technical_indicators.ma20)} /><Indicator label="MACD 动能" value={result.technical_indicators.macd} hint={macdHint(result.technical_indicators.macd)} /><Indicator label="RSI 强弱" value={result.technical_indicators.rsi} hint={rsiHint(result.technical_indicators.rsi)} /></div></CompactCard>

        <section className="grid gap-5 md:grid-cols-2"><CompactCard title="识别形态" icon="◇">{result.patterns.length ? <div className="space-y-2">{result.patterns.slice(0, 3).map((pattern, index) => <div key={`${pattern.name}-${index}`} className="rounded-xl bg-[#f4f7f3] p-3"><div className="flex items-center justify-between gap-2"><p className="font-semibold">{pattern.name}</p><span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-[#177a53]">{pattern.confidence}</span></div><p className="mt-1 text-xs text-[#64736e]">{shortText(pattern.position, 34)} · {shortText(pattern.market_meaning, 44)}</p></div>)}</div> : <p className="text-sm text-[#64736e]">未发现可可靠识别的形态。</p>}</CompactCard><CompactCard title="接下来观察什么" icon="◎"><ul className="space-y-2 text-sm leading-6 text-[#42534c]">{observationConditions.slice(0, 2).map((item, index) => <li key={index} className="flex gap-2"><span className="font-bold text-[#177a53]">•</span>{shortText(item, 62)}</li>)}</ul><div className="mt-3 border-t border-[#d9e3dc] pt-3"><SignalRow label="突破后" value={shortText(result.trading_plan?.if_breakout ?? "请重新分析以获取观察计划。", 52)} /><SignalRow label="跌破后" value={shortText(result.trading_plan?.if_breakdown ?? "请重新分析以获取观察计划。", 52)} /></div></CompactCard></section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"><div className="flex gap-3"><span className="mt-0.5 text-amber-700">⚠</span><div><p className="text-sm font-semibold text-amber-900">风险提示</p><p className="mt-1 text-sm leading-6 text-amber-800">{shortText(result.risk, 130)}</p></div></div></section>
      </div>
    </div>
  </div></main>;
}

function CompactCard({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) { return <section className="rounded-3xl border border-[#d9e3dc] bg-white p-5"><h2 className="mb-4 flex items-center gap-2 text-base font-bold"><span className="text-[#177a53]">{icon}</span>{title}</h2>{children}</section>; }
function Score({ label, value, tone }: { label: string; value: string; tone: Tone }) { return <div className={`rounded-xl border px-3 py-3 ${tone.score}`}><p className="text-[11px] font-semibold text-[#64736e]">{label}</p><p className={`mt-1 text-sm font-bold leading-5 ${tone.text}`}>{value}</p></div>; }
function MiniStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div className="rounded-xl bg-[#f4f7f3] p-3"><p className="text-[11px] font-semibold text-[#64736e]">{label}</p><p className={`mt-1 text-sm font-bold ${accent ? changeTone(value) : "text-[#10211c]"}`}>{value}</p></div>; }
function SignalRow({ label, value }: { label: string; value: string }) { return <div className="flex gap-3 border-b border-[#edf1ee] py-2 last:border-0"><span className="w-14 shrink-0 text-xs font-semibold text-[#64736e]">{label}</span><p className="text-sm leading-5 text-[#42534c]">{value}</p></div>; }
function Indicator({ label, value, hint }: { label: string; value: string; hint: string }) { return <div className="rounded-2xl bg-[#f4f7f3] p-4"><p className="text-xs font-bold text-[#177a53]">{label}</p><p className="mt-2 text-sm font-semibold text-[#10211c]">{value}</p><p className="mt-2 text-xs leading-5 text-[#64736e]">{hint}</p></div>; }
function Reason({ label, text, tone }: { label: string; text: string; tone: "support" | "resistance" }) { return <div className={`rounded-xl border p-3 ${tone === "support" ? "border-emerald-100 bg-emerald-50/40" : "border-red-100 bg-red-50/40"}`}><p className={`text-xs font-bold ${tone === "support" ? "text-[#177a53]" : "text-[#a34a34]"}`}>{label}</p><p className="mt-1 text-sm leading-5 text-[#42534c]">{text}</p></div>; }
function PriceRange({ current, support, resistance }: { current: number | null; support: number | null; resistance: number | null }) { const position = current !== null && support !== null && resistance !== null && resistance > support ? Math.max(5, Math.min(95, ((current - support) / (resistance - support)) * 100)) : 50; return <div><div className="relative h-3 rounded-full bg-gradient-to-r from-emerald-300 via-amber-200 to-red-300">{current !== null && <span className="absolute -top-1 h-5 w-5 -translate-x-1/2 rounded-full border-4 border-white bg-[#10211c] shadow" style={{ left: `${position}%` }} />}</div><div className="mt-2 flex justify-between text-xs text-[#64736e]"><span>支撑区</span><span>{current !== null ? `现价 ${current.toFixed(2)}` : "现价待确认"}</span><span>压力区</span></div></div>; }

type Tone = { card: string; score: string; text: string };
function getOutlook(result: AnalysisResponse) { const value = `${result.market_stage} ${result.trend.direction}`; if (/上涨|反转|上升|偏强/.test(value)) return { title: "趋势偏强，等待确认", rating: "偏强观察", risk: "中等", icon: "↑", tone: { card: "border-emerald-200 bg-emerald-50/60", score: "border-emerald-100 bg-white/80", text: "text-[#177a53]" } satisfies Tone, riskTone: { card: "border-amber-200 bg-amber-50/60", score: "border-amber-100 bg-white/80", text: "text-amber-700" } satisfies Tone }; if (/下跌|高位|偏弱/.test(value)) return { title: "趋势偏弱，优先控制风险", rating: "谨慎观察", risk: "较高", icon: "↓", tone: { card: "border-red-200 bg-red-50/60", score: "border-red-100 bg-white/80", text: "text-[#a34a34]" } satisfies Tone, riskTone: { card: "border-red-200 bg-red-50/60", score: "border-red-100 bg-white/80", text: "text-[#a34a34]" } satisfies Tone }; return { title: "方向未明，耐心等待", rating: "中性等待", risk: "中等", icon: "→", tone: { card: "border-slate-200 bg-slate-50", score: "border-slate-200 bg-white/80", text: "text-slate-700" } satisfies Tone, riskTone: { card: "border-amber-200 bg-amber-50/60", score: "border-amber-100 bg-white/80", text: "text-amber-700" } satisfies Tone }; }
function shortText(text: string, max: number) { return text.length > max ? `${text.slice(0, max)}…` : text; }
function parseNumber(text: string) { const match = text.match(/-?\d+(?:\.\d+)?/); return match ? Number(match[0]) : null; }
function compactNumber(text: string) { const value = Number(text); return Number.isFinite(value) && value >= 10_000 ? `${(value / 10_000).toFixed(1)}万` : text; }
function changeTone(value: string) { return value.startsWith("-") ? "text-[#a34a34]" : value === "行情暂时不可用" ? "text-[#64736e]" : "text-[#177a53]"; }
function volumeTone(value: string) { return /下跌|背离/.test(value) ? "text-[#a34a34]" : /上涨/.test(value) ? "text-[#177a53]" : "text-slate-700"; }
function maHint(price: number | null, ma5: string, ma20: string) { const fast = parseNumber(ma5); const mid = parseNumber(ma20); if (price !== null && fast !== null && mid !== null) return price >= fast && price >= mid ? "现价位于短中期均线上方，短线相对占优。" : "现价未同时站上短中期均线，留意趋势强度。"; return "MA 用于观察价格相对趋势线的位置。"; }
function macdHint(value: string) { const number = parseNumber(value); return number === null ? "MACD 用于观察趋势动能变化。" : number >= 0 ? "数值为正，动能偏多；仍需观察是否持续。" : "数值为负，动能偏弱；关注能否修复。"; }
function rsiHint(value: string) { const number = parseNumber(value); return number === null ? "RSI 用于观察短线强弱。" : number >= 70 ? "短线偏热，注意波动放大。" : number <= 30 ? "短线偏弱，留意是否出现止跌信号。" : "处于中性区间，结合趋势与关键位判断。"; }
