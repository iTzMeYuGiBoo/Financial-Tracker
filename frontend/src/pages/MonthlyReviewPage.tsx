import React, { useEffect, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import api from "../services/api";
import { aiService } from "../services/ai.service";
import toast from "react-hot-toast";
import { CalendarRange, RefreshCw, Sparkles } from "lucide-react";

interface ReviewCategory { categoryName:string; categoryIcon:string; categoryColor:string; amount:number; percentage:number; }
interface ReviewTx { id:number; date:string; description:string; type:"INCOME"|"EXPENSE"; amount:number; categoryName:string; categoryIcon:string; categoryColor:string; }
interface ReviewSummary { from:string; to:string; totalIncome:number; totalExpenses:number; netSavings:number; savingsRate:number; avgDailySpend:number; topCategories:ReviewCategory[]; largestTransactions:ReviewTx[]; }

const fmtEur = (v: number|undefined|null) => {
  const safe = typeof v==="number" && !isNaN(v) ? v : 0;
  return safe.toLocaleString("en-IE",{style:"currency",currency:"EUR",minimumFractionDigits:0});
};

const MonthlyReviewPage: React.FC = () => {
  const today = new Date();
  const [from, setFrom] = useState(new Date(today.getFullYear(),today.getMonth(),1).toISOString().slice(0,10));
  const [to,   setTo]   = useState(today.toISOString().slice(0,10));
  const [summary, setSummary]   = useState<ReviewSummary|null>(null);
  const [loading, setLoading]   = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [highlights, setHighlights]   = useState<string[]>([]);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [note, setNote]         = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const runReview = async () => {
    if (!from||!to) { toast.error("Please select both dates"); return; }
    if (from>to)    { toast.error("Start date must be before end date"); return; }
    setLoading(true);
    try {
      const res = await api.get<ReviewSummary>(`/review?from=${from}&to=${to}`);
      const d = res.data;
      setSummary({ ...d, totalIncome:Number(d.totalIncome)||0, totalExpenses:Number(d.totalExpenses)||0, netSavings:Number(d.netSavings)||0, savingsRate:Number(d.savingsRate)||0, avgDailySpend:Number(d.avgDailySpend)||0, topCategories:Array.isArray(d.topCategories)?d.topCategories:[], largestTransactions:Array.isArray(d.largestTransactions)?d.largestTransactions:[] });
      setHighlights([]); setImprovements([]);
      try { const noteRes = await api.get<{year:number;month:number;note:string}>(`/monthly-notes?year=${new Date(from).getFullYear()}&month=${new Date(from).getMonth()+1}`); setNote(noteRes.data?.note||""); } catch { setNote(""); }
    } catch { toast.error("Failed to load review"); }
    finally { setLoading(false); }
  };
  useEffect(() => { runReview(); }, []); // eslint-disable-line

  const handleAskAi = async () => {
    if (!summary) { toast("Run a review first"); return; }
    setAiLoading(true);
    try { const res = await aiService.getMonthlyReview({summary}); setHighlights(Array.isArray(res.data.highlights)?res.data.highlights:[]); setImprovements(Array.isArray(res.data.improvements)?res.data.improvements:[]); }
    catch { toast.error("AI service unavailable"); }
    finally { setAiLoading(false); }
  };

  const handleSaveNote = async () => {
    const d = new Date(from); setSavingNote(true);
    try { await api.post("/monthly-notes",{year:d.getFullYear(),month:d.getMonth()+1,note}); toast.success("Note saved"); }
    catch { toast.error("Failed to save note"); }
    finally { setSavingNote(false); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Monthly Review" subtitle="Pick any date range, review your finances, jot notes, and get an AI summary."
        actions={
          <div className="flex items-center gap-2 text-xs">
            <button onClick={runReview} className="btn-secondary flex items-center gap-1"><RefreshCw size={14}/> Run review</button>
            <button onClick={handleAskAi} disabled={aiLoading} className="btn-primary flex items-center gap-1"><Sparkles size={14}/> {aiLoading?"Asking AI...":"Ask AI"}</button>
          </div>
        }
      />
      <div className="card p-4 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1 sm:mb-0"><CalendarRange size={14}/><span>Review period</span></div>
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          <div className="flex flex-col gap-1 text-xs flex-1"><label className="text-gray-500">From</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="input text-xs"/></div>
          <div className="flex flex-col gap-1 text-xs flex-1"><label className="text-gray-500">To</label><input type="date" value={to} onChange={e=>setTo(e.target.value)} className="input text-xs"/></div>
        </div>
        <div className="text-[11px] text-gray-400 mt-1 sm:mt-0">Current: {summary?.from??from} → {summary?.to??to}</div>
      </div>
      {loading && <LoadingSpinner size="sm" className="py-10"/>}
      {summary && !loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-4"><p className="text-[11px] text-gray-500 mb-1">Total income</p><p className="text-lg font-bold text-gray-900">{fmtEur(summary.totalIncome)}</p></div>
            <div className="card p-4"><p className="text-[11px] text-gray-500 mb-1">Total expenses</p><p className="text-lg font-bold text-gray-900">{fmtEur(summary.totalExpenses)}</p></div>
            <div className="card p-4"><p className="text-[11px] text-gray-500 mb-1">Net savings</p><p className={`text-lg font-bold ${summary.netSavings>=0?"text-emerald-600":"text-red-600"}`}>{fmtEur(summary.netSavings)}</p></div>
            <div className="card p-4"><p className="text-[11px] text-gray-500 mb-1">Avg daily spend</p><p className="text-lg font-bold text-gray-900">{fmtEur(summary.avgDailySpend)}</p><p className="text-[11px] text-gray-400 mt-0.5">Savings rate: {summary.savingsRate}%</p></div>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-700 mb-2">Monthly note</p>
            <textarea className="input text-xs min-h-[80px]" value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a short note for this month..."/>
            <div className="flex justify-end mt-2"><button onClick={handleSaveNote} disabled={savingNote} className="btn-secondary text-xs">{savingNote?"Saving...":"Save note"}</button></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-4">
              <p className="text-xs font-semibold text-gray-700 mb-3">Top spending categories</p>
              {summary.topCategories.length===0 ? <p className="text-xs text-gray-400">No expenses in this period.</p> : (
                <div className="space-y-2 text-xs">
                  {summary.topCategories.map(c=>(
                    <div key={c.categoryName} className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{backgroundColor:c.categoryColor+"20"}}>{c.categoryIcon}</div><span className="font-medium text-gray-800">{c.categoryName}</span></div>
                      <div className="text-right"><p className="font-semibold text-gray-900">{fmtEur(c.amount)}</p><p className="text-[11px] text-gray-400">{c.percentage}% of spend</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card p-4">
              <p className="text-xs font-semibold text-gray-700 mb-3">Largest transactions</p>
              {summary.largestTransactions.length===0 ? <p className="text-xs text-gray-400">No transactions in this period.</p> : (
                <div className="space-y-2 text-xs max-h-64 overflow-y-auto">
                  {summary.largestTransactions.map(t=>(
                    <div key={t.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{backgroundColor:t.categoryColor+"20"}}>{t.categoryIcon}</div><div><p className="font-medium text-gray-800">{t.description}</p><p className="text-[11px] text-gray-400">{t.date} · {t.categoryName} · {t.type}</p></div></div>
                      <p className={`font-semibold ${t.type==="INCOME"?"text-emerald-600":"text-red-600"}`}>{t.type==="INCOME"?"+":"-"}{fmtEur(t.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {(highlights.length>0||improvements.length>0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card p-4"><p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1"><Sparkles size={14} className="text-emerald-500"/> Highlights</p><ul className="list-disc pl-5 text-xs text-gray-700 space-y-1">{highlights.map((h,i)=><li key={i}>{h}</li>)}</ul></div>
              <div className="card p-4"><p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1"><Sparkles size={14} className="text-amber-500"/> Improvements</p><ul className="list-disc pl-5 text-xs text-gray-700 space-y-1">{improvements.map((h,i)=><li key={i}>{h}</li>)}</ul></div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
export default MonthlyReviewPage;
