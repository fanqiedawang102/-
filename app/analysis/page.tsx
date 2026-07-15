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
    const saved = sessionStorage.getItem("chart-analysis");
    if (saved) setAnalysis(JSON.parse(saved));
    let currentUrl: string | null = null; let cancelled = false;
    loadAnalysisImage().then((image) => { if (!image) { if (!cancelled) setImageUnavailable(true); return; } currentUrl = URL.createObjectURL(image); if (!cancelled) setImageUrl(currentUrl); }).catch(() => { if (!cancelled) setImageUnavailable(true); });
    return () => { cancelled = true; if (currentUrl) URL.revokeObjectURL(currentUrl); };
  }, []);
  if (!analysis) return <main className="grid min-h-screen place-items-center p-6 text-center"><div><p className="text-lg font-semibold">没有可展示的分析结果</p><Link href="/" className="mt-4 inline-block font-semibold text-[#177a53]">返回上传图片 →</Link></div></main>;
  const { result, stockCode, market, period } = analysis;
  const observationConditions = Array.isArray(result.trading_plan?.observation_conditions) ? result.trading_plan.observation_conditions : [];
  return <main className="min-h-screen px-5 py-10 sm:px-8 lg:px-16"><div className="mx-auto max-w-5xl">
    <header className="mb-8 flex items-center justify-between"><Link href="/" className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#177a53] text-lg text-white">⌁</div><span className="text-sm font-bold tracking-wide">AI CHART ANALYST</span></Link><Link href="/" className="text-sm font-semibold text-[#177a53]">分析另一张图</Link></header>
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-[#177a53]">AI 视觉分析报告</p><h1 className="mt-2 text-3xl font-bold">{stockCode || "未填写代码"} 的K线分析</h1><p className="mt-2 text-sm text-[#64736e]">{market} · {period} · 结果仅供技术分析参考</p></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-[#177a53]">{result.market_stage}</span></div>
    <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><aside className="overflow-hidden rounded-3xl border border-[#d9e3dc] bg-white p-4">{imageUrl ? <img src={imageUrl} alt="用于分析的K线图" className="h-64 w-full rounded-2xl object-contain bg-[#f4f7f3]" /> : <div className="grid h-64 place-items-center rounded-2xl bg-[#f4f7f3] px-5 text-center text-sm text-[#64736e]">{imageUnavailable ? "未找到本次分析的图片。请返回后重新上传。" : "正在恢复已上传的K线图…"}</div>}<p className="mt-4 text-sm leading-6 text-[#64736e]">本次结果由 AI 视觉模型生成，仅供技术分析参考。</p></aside>
      <div className="space-y-5">
        <Card title="行情概览"><div className="grid gap-3 sm:grid-cols-3"><Info label="当前价格" area={result.market_overview.current_price} reason={`数据源：${result.market_overview.data_source}`} /><Info label="涨跌幅" area={result.market_overview.change_percent} reason="基于上一交易时段收盘价计算" /><Info label="最新成交量" area={result.market_overview.latest_volume} reason="行情接口返回的最新可用成交量" /></div></Card>
        <Card title="技术指标"><div className="grid grid-cols-2 gap-3 sm:grid-cols-5"><Metric label="MA5" value={result.technical_indicators.ma5} /><Metric label="MA20" value={result.technical_indicators.ma20} /><Metric label="MA60" value={result.technical_indicators.ma60} /><Metric label="MACD" value={result.technical_indicators.macd} /><Metric label="RSI" value={result.technical_indicators.rsi} /></div></Card>
        <Card title="趋势分析" accent><p className="text-lg font-semibold text-[#177a53]">{result.trend.direction}</p><Detail label="均线结构" text={result.trend.moving_average} /><Detail label="高低点关系" text={result.trend.high_low_structure} /><Detail label="K线排列" text={result.trend.candlestick_arrangement} /></Card>
        <Card title="K线形态">{result.patterns.length ? <div className="space-y-3">{result.patterns.map((pattern, index) => <div key={`${pattern.name}-${index}`} className="rounded-xl bg-[#f4f7f3] p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold">{pattern.name}</p><span className="text-sm font-medium text-[#177a53]">可信度 {pattern.confidence}</span></div><Detail label="出现位置" text={pattern.position} /><Detail label="市场含义" text={pattern.market_meaning} /></div>)}</div> : <p className="text-sm text-[#64736e]">未发现可可靠识别的形态。</p>}</Card>
        <Card title="关键价格"><div className="grid gap-3 sm:grid-cols-2"><Info label="支撑" area={result.support.area} reason={result.support.reason} /><Info label="压力" area={result.resistance.area} reason={result.resistance.reason} /></div></Card>
        <Card title="成交量"><p className="font-semibold text-[#177a53]">{result.volume.assessment}</p><p className="mt-2 leading-7 text-[#42534c]">{result.volume.evidence}</p></Card>
        <Card title="交易观察计划"><div className="space-y-3 text-sm leading-6 text-[#42534c]"><div><p className="font-semibold text-[#177a53]">观察条件</p><ul className="mt-1 list-disc pl-5">{observationConditions.map((item, index) => <li key={index}>{item}</li>)}</ul></div><Detail label="如果突破" text={result.trading_plan?.if_breakout ?? "请重新分析以获取观察计划。"} /><Detail label="如果跌破" text={result.trading_plan?.if_breakdown ?? "请重新分析以获取观察计划。"} /></div></Card>
        <Card title="风险提示"><p className="leading-7 text-[#8a4b2b]">{result.risk}</p></Card><Card title="分析摘要"><p className="leading-7 text-[#42534c]">{result.summary}</p></Card>
      </div>
    </div>
  </div></main>;
}

function Card({ title, children, accent = false }: { title: string; children: React.ReactNode; accent?: boolean }) { return <section className={`rounded-3xl border p-5 sm:p-6 ${accent ? "border-emerald-200 bg-emerald-50/50" : "border-[#d9e3dc] bg-white"}`}><h2 className="mb-4 text-lg font-bold">{title}</h2>{children}</section>; }
function Detail({ label, text }: { label: string; text: string }) { return <p className="mt-2 text-sm leading-6 text-[#64736e]"><span className="font-semibold text-[#42534c]">{label}：</span>{text}</p>; }
function Info({ label, area, reason }: { label: string; area: string; reason: string }) { return <div className="rounded-xl border border-[#d9e3dc] p-4"><p className="text-sm font-semibold text-[#177a53]">{label}</p><p className="mt-2 text-sm font-medium text-[#42534c]">{area}</p><p className="mt-1 text-sm leading-6 text-[#64736e]">原因：{reason}</p></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-[#f4f7f3] p-3"><p className="text-xs font-semibold text-[#64736e]">{label}</p><p className="mt-1 text-sm font-semibold text-[#42534c]">{value}</p></div>; }
