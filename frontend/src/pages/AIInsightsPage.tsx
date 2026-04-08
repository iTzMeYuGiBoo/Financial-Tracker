import React, { useEffect, useState, useRef } from "react";
import { Sparkles, Lightbulb, TrendingUp, Target, Send, Bot, User, Loader2 } from "lucide-react";
import { useAppSelector, useAppDispatch } from "../hooks/useAppDispatch";
import { fetchTransactions } from "../store/slices/transactionSlice";
import { aiService } from "../services/ai.service";
import PageHeader from "../components/ui/PageHeader";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import toast from "react-hot-toast";

interface AIResponse { insights?:string[]; tips?:string[]; advice?:string[]; source?:string; }
interface ChatMessage { role:"user"|"assistant"; content:string; toolCalls?:string[]; }

const AIInsightsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { transactions } = useAppSelector(s => s.transactions);
  const [insights, setInsights] = useState<AIResponse|null>(null);
  const [savings, setSavings] = useState<AIResponse|null>(null);
  const [loading, setLoading] = useState<string|null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ dispatch(fetchTransactions()); },[dispatch]);
  useEffect(()=>{ chatEndRef.current?.scrollIntoView({behavior:"smooth"}); },[chatMessages]);

  const handleGetInsights = async () => {
    setLoading("insights");
    try { const r = await aiService.getInsights({}); setInsights(r.data); }
    catch { toast.error("AI service unavailable. Make sure middleware is running."); }
    finally { setLoading(null); }
  };

  const handleGetTips = async () => {
    setLoading("tips");
    try { const r = await aiService.getSavingsTips({}); setSavings(r.data); }
    catch { toast.error("AI service unavailable. Make sure middleware is running."); }
    finally { setLoading(null); }
  };

  const handleSendChat = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    const userMsg: ChatMessage = { role: "user", content: msg };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);
    try {
      const history = chatMessages.map(m => ({ role: m.role, content: m.content }));
      const r = await aiService.chat(msg, history);
      const assistantMsg: ChatMessage = { role: "assistant", content: r.data.message, toolCalls: r.data.toolCalls };
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch {
      toast.error("AI service unavailable");
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't process your request. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const aiSource = (s?:string) => s==="gemini"?"✨ Powered by Gemini AI with MCP Tools":"🤖 Demo mode (add GEMINI_API_KEY for real AI)";

  return (
    <div>
      <PageHeader title="AI Financial Insights" subtitle="Personalised analysis powered by Google Gemini with MCP tool access"/>
      <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-2xl border border-primary-100 p-5 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0"><Sparkles size={18} className="text-primary-600"/></div>
          <div><h3 className="font-semibold text-gray-900 text-sm mb-1">How it works</h3><p className="text-sm text-gray-600">Gemini AI uses MCP (Model Context Protocol) tools to securely access your financial data in real-time. It can query your transactions, budgets, goals, and more to provide personalised, context-aware advice. No data is stored externally.</p></div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><TrendingUp size={18} className="text-blue-600"/><h3 className="text-sm font-semibold text-gray-900">Spending Insights</h3></div>
            <button onClick={handleGetInsights} disabled={loading==="insights"||transactions.length===0} className="btn-primary text-xs">{loading==="insights"?<><LoadingSpinner size="sm"/>Analysing...</>:<><Sparkles size={13}/>Analyse</>}</button>
          </div>
          {insights?(
            <div>
              {insights.source&&<p className="text-xs text-gray-400 mb-3">{aiSource(insights.source)}</p>}
              <div className="space-y-2">{(insights.insights||[]).map((insight,i)=><div key={i} className="flex gap-3 bg-blue-50 rounded-xl px-4 py-3"><span className="text-blue-500 flex-shrink-0 mt-0.5">💡</span><p className="text-sm text-blue-800">{insight}</p></div>)}</div>
            </div>
          ):<div className="text-center py-8"><TrendingUp size={32} className="text-gray-200 mx-auto mb-2"/><p className="text-sm text-gray-400">{transactions.length===0?"Add transactions first":"Click Analyse for spending patterns"}</p></div>}
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Lightbulb size={18} className="text-yellow-500"/><h3 className="text-sm font-semibold text-gray-900">Savings Tips</h3></div>
            <button onClick={handleGetTips} disabled={loading==="tips"||transactions.length===0} className="btn-primary text-xs">{loading==="tips"?<><LoadingSpinner size="sm"/>Generating...</>:<><Sparkles size={13}/>Get Tips</>}</button>
          </div>
          {savings?(
            <div>
              {savings.source&&<p className="text-xs text-gray-400 mb-3">{aiSource(savings.source)}</p>}
              <div className="space-y-2">{(savings.tips||[]).map((tip,i)=><div key={i} className="flex gap-3 bg-yellow-50 rounded-xl px-4 py-3"><span className="text-yellow-500 flex-shrink-0 mt-0.5"><Target size={14}/></span><p className="text-sm text-yellow-800">{tip}</p></div>)}</div>
            </div>
          ):<div className="text-center py-8"><Lightbulb size={32} className="text-gray-200 mx-auto mb-2"/><p className="text-sm text-gray-400">{transactions.length===0?"Add transactions first":"Click Get Tips for personalised savings advice"}</p></div>}
        </div>
      </div>

      {/* Chat Interface */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bot size={18} className="text-purple-600"/>
          <h3 className="text-sm font-semibold text-gray-900">Ask Your Finance AI</h3>
          <span className="text-[11px] text-gray-400 ml-auto">Gemini + MCP Tools</span>
        </div>
        <div className="bg-gray-50 rounded-xl border border-gray-100 h-80 overflow-y-auto p-4 mb-3 space-y-3">
          {chatMessages.length===0 && (
            <div className="text-center py-10">
              <Bot size={40} className="text-gray-200 mx-auto mb-3"/>
              <p className="text-sm text-gray-400 mb-2">Ask me anything about your finances</p>
              <div className="flex flex-wrap justify-center gap-2">
                {["What are my biggest expenses?","Am I on track with my budgets?","How's my financial health?","What subscriptions can I cancel?"].map(q => (
                  <button key={q} onClick={()=>{setChatInput(q);}} className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 transition-colors">{q}</button>
                ))}
              </div>
            </div>
          )}
          {chatMessages.map((m,i)=>(
            <div key={i} className={`flex gap-2 ${m.role==="user"?"justify-end":""}`}>
              {m.role==="assistant" && <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5"><Bot size={14} className="text-purple-600"/></div>}
              <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${m.role==="user"?"bg-primary-600 text-white":"bg-white border border-gray-100 text-gray-800"}`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.toolCalls && m.toolCalls.length>0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.toolCalls.map((tc,j) => <span key={j} className="text-[10px] bg-purple-50 text-purple-600 rounded px-1.5 py-0.5 border border-purple-100">🔧 {tc.replace(/_/g," ")}</span>)}
                  </div>
                )}
              </div>
              {m.role==="user" && <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5"><User size={14} className="text-primary-600"/></div>}
            </div>
          ))}
          {chatLoading && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0"><Bot size={14} className="text-purple-600"/></div>
              <div className="bg-white border border-gray-100 rounded-xl px-4 py-2.5"><Loader2 size={16} className="animate-spin text-purple-400"/></div>
            </div>
          )}
          <div ref={chatEndRef}/>
        </div>
        <form onSubmit={e=>{e.preventDefault();handleSendChat();}} className="flex gap-2">
          <input type="text" value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Ask about your spending, budgets, goals..." className="input flex-1 text-sm" disabled={chatLoading}/>
          <button type="submit" disabled={!chatInput.trim()||chatLoading} className="btn-primary"><Send size={16}/></button>
        </form>
      </div>
    </div>
  );
};
export default AIInsightsPage;
