import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Target, Plus, Trash2, X, AlertTriangle } from "lucide-react";
import { Budget, Category } from "../types";
import api from "../services/api";
import { categoryService } from "../services/category.service";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import toast from "react-hot-toast";
import clsx from "clsx";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const schema = z.object({ categoryId: z.number(), limitAmount: z.number().positive(), month: z.number().min(1).max(12), year: z.number().min(2020) });
type F = z.infer<typeof schema>;

const BudgetsPage: React.FC = () => {
  const [budgets, setBudgets]     = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteBudget, setDeleteBudget] = useState<Budget | null>(null);
  const now = new Date();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: { month: now.getMonth() + 1, year: now.getFullYear() }
  });

  const load = async () => {
    setLoading(true);
    try {
      const [budgetRes, catData] = await Promise.all([api.get("/budgets"), categoryService.getAll()]);
      const raw = budgetRes.data;
      setBudgets(Array.isArray(raw) ? raw : Array.isArray(raw?.content) ? raw.content : []);
      const rawCats = Array.isArray(catData.data) ? catData.data : [];
      setCategories(rawCats.filter((c: Category) => c.type === "EXPENSE"));
    } catch { toast.error("Failed to load budgets"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (data: F) => {
    try { await api.post("/budgets", data); toast.success("Budget set!"); reset({ month: now.getMonth()+1, year: now.getFullYear() }); setShowModal(false); load(); }
    catch (e: any) { toast.error(e.response?.data?.error || "Failed"); }
  };
  const handleDelete = async () => {
    if (!deleteBudget) return;
    try { await api.delete(`/budgets/${deleteBudget.id}`); toast.success("Deleted"); }
    catch { toast.error("Failed to delete"); }
    setDeleteBudget(null); load();
  };

  const getBarColor = (p: number, over: boolean) => over ? "bg-red-500" : p>80 ? "bg-orange-400" : p>60 ? "bg-yellow-400" : "bg-green-500";
  const safeBudgets = Array.isArray(budgets) ? budgets : [];
  const safeCats    = Array.isArray(categories) ? categories : [];

  return (
    <div>
      <PageHeader title="Budgets" subtitle="Set and track monthly spending limits" actions={<button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={15} />Set Budget</button>} />
      {loading ? <LoadingSpinner size="lg" className="py-32" /> : safeBudgets.length === 0 ? (
        <EmptyState icon={Target} title="No budgets set" description="Set spending limits per category" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {safeBudgets.map(b => (
            <div key={b.id} className={clsx("card p-5 relative group", b.isOverBudget && "border-red-200")}>
              {b.isOverBudget && <div className="absolute top-3 right-3"><AlertTriangle size={16} className="text-red-500" /></div>}
              <button onClick={() => setDeleteBudget(b)} className="absolute top-3 right-8 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: b.categoryColor+"20" }}>{b.categoryIcon}</div>
                <div><p className="font-semibold text-gray-900 text-sm">{b.categoryName}</p><p className="text-xs text-gray-400">{MONTHS[b.month-1]} {b.year}</p></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Spent</span><span className={clsx("font-bold", b.isOverBudget?"text-red-600":"text-gray-900")}>{b.percentage.toFixed(0)}%</span></div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className={clsx("h-full rounded-full transition-all", getBarColor(b.percentage,b.isOverBudget))} style={{ width:`${Math.min(b.percentage,100)}%` }} /></div>
                <div className="flex justify-between text-xs">
                  <span className={clsx("font-medium", b.isOverBudget?"text-red-500":"text-gray-500")}>€{Number(b.spentAmount).toFixed(2)} spent</span>
                  <span className="text-gray-400">€{Number(b.limitAmount).toFixed(2)} limit</span>
                </div>
                {b.isOverBudget ? <p className="text-xs text-red-500 font-medium">Over by €{Math.abs(Number(b.remainingAmount)).toFixed(2)}</p> : <p className="text-xs text-green-600 font-medium">€{Number(b.remainingAmount).toFixed(2)} remaining</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm animate-fade-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Set Budget</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              <div><label className="label">Expense Category</label>
                <select {...register("categoryId",{valueAsNumber:true})} className="input"><option value="">Select...</option>{safeCats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select>
                {errors.categoryId && <p className="text-xs text-red-500 mt-1">Required</p>}
              </div>
              <div><label className="label">Monthly Limit (€)</label><input type="number" step="0.01" {...register("limitAmount",{valueAsNumber:true})} className="input" placeholder="500" />{errors.limitAmount && <p className="text-xs text-red-500 mt-1">Required</p>}</div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Month</label><select {...register("month",{valueAsNumber:true})} className="input">{MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}</select></div>
                <div><label className="label">Year</label><input type="number" {...register("year",{valueAsNumber:true})} className="input" placeholder={String(now.getFullYear())} /></div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">{isSubmitting?<LoadingSpinner size="sm" />:"Set Budget"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog isOpen={!!deleteBudget} title="Delete Budget" message={`Delete budget for "${deleteBudget?.categoryName}"?`} onConfirm={handleDelete} onCancel={() => setDeleteBudget(null)} />
    </div>
  );
};
export default BudgetsPage;
