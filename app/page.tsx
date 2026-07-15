"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisResponse } from "@/lib/analysis";
import { saveAnalysisImage } from "@/lib/image-store";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
type QuotePreview = { symbol: string; price: string; change: string; volume: string };

export default function Home() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stockCode, setStockCode] = useState("");
  const [market, setMarket] = useState("A股");
  const [period, setPeriod] = useState("日K");
  const [quote, setQuote] = useState<QuotePreview | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<string | null>(null);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  useEffect(() => {
    if (market !== "A股" || !/^\d{6}$/.test(stockCode)) { setQuote(null); setQuoteStatus(null); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setQuoteStatus("正在获取实时行情…");
      try {
        const response = await fetch(`/api/market?stockCode=${stockCode}`, { signal: controller.signal, cache: "no-store" });
        const payload = await response.json() as { available: boolean; data?: QuotePreview; message?: string };
        if (!response.ok || !payload.available || !payload.data) throw new Error(payload.message || "行情暂时不可用。");
        setQuote(payload.data); setQuoteStatus(null);
      } catch (caught) { if (!controller.signal.aborted) { setQuote(null); setQuoteStatus(caught instanceof Error ? caught.message : "行情暂时不可用。"); } }
    }, 350);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [stockCode, market]);

  function selectFile(selected: File | undefined) {
    if (!selected) return;
    if (!ACCEPTED_TYPES.includes(selected.type)) return setError("请选择 PNG、JPG 或 WEBP 格式的图片。");
    if (selected.size > MAX_FILE_SIZE) return setError("图片大小不能超过 10MB。");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setError(null);
  }

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null); setPreviewUrl(null); setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function startAnalysis() {
    if (!file) return setError("请先上传一张K线图。");
    setIsAnalyzing(true); setError(null);
    try {
      const body = new FormData();
      body.append("image", file);
      body.append("stockCode", stockCode);
      body.append("market", market);
      body.append("period", period);
      const response = await fetch("/api/analyze", { method: "POST", body });
      const payload = await response.json() as AnalysisResponse | { error: string };
      if (!response.ok || !("trend" in payload)) throw new Error("error" in payload ? payload.error : "分析暂时无法完成，请稍后重试。");
      await saveAnalysisImage(file);
      sessionStorage.setItem("chart-analysis", JSON.stringify({ result: payload, stockCode, market, period }));
      router.push("/analysis");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "分析暂时无法完成，请稍后重试。");
    } finally { setIsAnalyzing(false); }
  }

  return <main className="min-h-screen px-5 py-10 sm:px-8 lg:px-16">
    <div className="mx-auto max-w-5xl">
      <header className="mb-10 flex items-center justify-between"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#177a53] text-lg text-white">⌁</div><span className="text-sm font-bold tracking-wide">AI CHART ANALYST</span></div><span className="rounded-full border border-[#d9e3dc] bg-white px-3 py-1.5 text-xs text-[#64736e]">MVP · Phase 2</span></header>
      <section className="grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
        <div><p className="mb-4 text-sm font-semibold text-[#177a53]">技术分析辅助工具</p><h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">上传你的 K 线图，<br />让 AI 帮你理解市场结构</h1><p className="mt-5 max-w-lg leading-7 text-[#64736e]">识别趋势、K线形态与关键价格区域，生成清晰的技术分析参考。投资有风险，分析不构成任何投资建议。</p><div className="mt-8 flex gap-6 text-sm text-[#64736e]"><span>✓ 支持 PNG / JPG / WEBP</span><span>✓ 最大 10MB</span></div></div>
        <div className="rounded-3xl border border-[#d9e3dc] bg-white p-5 shadow-[0_16px_50px_rgba(23,48,38,.08)] sm:p-7">
          <input ref={inputRef} className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event: ChangeEvent<HTMLInputElement>) => selectFile(event.target.files?.[0])} />
          {previewUrl ? <div><div className="relative overflow-hidden rounded-2xl border border-[#d9e3dc] bg-[#f4f7f3]"><img src={previewUrl} alt="已上传的K线图预览" className="h-64 w-full object-contain sm:h-72" /><button onClick={clearFile} disabled={isAnalyzing} className="absolute right-3 top-3 rounded-lg bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-red-50 disabled:opacity-60">删除</button></div><div className="mt-4 flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate text-[#64736e]">{file?.name}</span><button onClick={() => inputRef.current?.click()} disabled={isAnalyzing} className="shrink-0 font-semibold text-[#177a53] hover:text-[#106540] disabled:opacity-60">重新上传</button></div></div> : <div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files?.[0]); }} onClick={() => inputRef.current?.click()} className={`flex h-72 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition ${dragging ? "border-[#177a53] bg-emerald-50" : "border-[#c8d5cd] hover:border-[#177a53] hover:bg-[#f8fbf8]"}`}><div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-2xl text-[#177a53]">↑</div><p className="font-semibold">拖拽 K 线图到这里，或点击上传</p><p className="mt-2 text-sm text-[#64736e]">PNG、JPG、WEBP，最大 10MB</p></div>}
          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      </section>
      <section className="mt-8 rounded-3xl border border-[#d9e3dc] bg-white p-5 sm:p-7"><div className="mb-5"><h2 className="text-lg font-bold">补充信息 <span className="text-sm font-normal text-[#64736e]">（可选）</span></h2><p className="mt-1 text-sm text-[#64736e]">帮助 AI 更准确地理解这张图。</p></div><div className="grid gap-4 md:grid-cols-3"><label className="text-sm font-medium">股票代码<input value={stockCode} onChange={(event) => setStockCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="例如：300308" className="mt-2 w-full rounded-xl border border-[#d9e3dc] px-4 py-3 outline-none transition focus:border-[#177a53] focus:ring-2 focus:ring-emerald-100" /></label><label className="text-sm font-medium">市场<select value={market} onChange={(event) => setMarket(event.target.value)} className="mt-2 w-full rounded-xl border border-[#d9e3dc] bg-white px-4 py-3 outline-none focus:border-[#177a53] focus:ring-2 focus:ring-emerald-100"><option>A股</option><option>港股</option><option>美股</option><option>其他</option></select></label><label className="text-sm font-medium">K线周期<select value={period} onChange={(event) => setPeriod(event.target.value)} className="mt-2 w-full rounded-xl border border-[#d9e3dc] bg-white px-4 py-3 outline-none focus:border-[#177a53] focus:ring-2 focus:ring-emerald-100"><option>日K</option><option>周K</option><option>月K</option><option>60分钟</option><option>30分钟</option><option>15分钟</option></select></label></div>{quote && <div className="mt-5 grid gap-3 rounded-2xl bg-[#f4f7f3] p-4 sm:grid-cols-3"><QuoteItem label="当前价格" value={quote.price} /><QuoteItem label="涨跌幅" value={quote.change} positive={quote.change.startsWith("+") || !quote.change.startsWith("-")} /><QuoteItem label="成交量" value={formatVolume(quote.volume)} /></div>}{quoteStatus && <p className="mt-3 text-sm text-[#64736e]">{quoteStatus}</p>}<button onClick={startAnalysis} disabled={isAnalyzing} className="mt-7 w-full rounded-xl bg-[#177a53] px-5 py-3.5 font-semibold text-white transition hover:bg-[#106540] disabled:cursor-wait disabled:opacity-70 sm:w-auto">{isAnalyzing ? "正在读取K线图…" : <>开始分析 <span aria-hidden>→</span></>}</button></section>
    </div>
  </main>;
}

function QuoteItem({ label, value, positive }: { label: string; value: string; positive?: boolean }) { return <div><p className="text-xs font-semibold text-[#64736e]">{label}</p><p className={`mt-1 text-lg font-bold ${positive === undefined ? "text-[#10211c]" : positive ? "text-[#177a53]" : "text-red-600"}`}>{value}</p></div>; }
function formatVolume(value: string) { const number = Number(value); return Number.isFinite(number) && number >= 10_000 ? `${(number / 10_000).toFixed(2)}万` : value; }
