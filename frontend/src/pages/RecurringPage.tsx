import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCw, Plus, Trash2, X, Zap } from "lucide-react";
import { RecurringTransaction, Category } from "../types";
import { recurringService } from "../services/recurring.service";
import { categoryService } from "../services/category.service";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import toast from "react-hot-toast";
import clsx from "clsx";

const FREQS = ["WEEKLY","BIWEEKLY","MONTHLY","QUARTERLY","YEARLY"];
const schema = z.object({ name: z.string().min(1), amount: z.number().positive(), type: z.enum(["INCOME","EXPENSE"]), frequency: z.string().min(1), categoryId: z.number(), nextDueDate: z.string().min(1), note: z.string().optional() });
type F = z.infer<typeof schema>;

const RecurringPage: React.FC = () => {
  const [recurrings, setRecurrings] = useState<RecurringTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [deleteR, setDeleteR]       = useState<RecurringTransaction | null>(null);

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: { type: "EXPENSE", frequency: "MONTHLY" }
  });
  const selType = watch("type");
  const safeCats = Array.isArray(categories) ? categories : [];
  const filteredCats = safeCats.filter(c => c.type === selType);

  const load = async () => {
    setLoading(true);
    try {
      const [r, c] = await Promise.all([recurringService.getAll(), categoryService.getAll()]);
      setRecurrings(Array.isArray(r.data) ? r.data : []);
      setCategories(Array.isArray(c.data) ? c.data : []);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (data: F) => {
    try { await recurringService.create(data); toast.success("Recurring added!"); reset(); setShowModal(false); load(); }
    catch { toast.error("Failed"); }
  };
  const handleDelete = async () => {
    if (!deleteR) return;
    try { await recurringService.delete(deleteR.id); toast.success("Deleted"); }
    catch { toast.error("Failed to delete"); }
    setDeleteR(null); load();
  };
  const handleProcess = async () => {
    try { const { data } = await recurringService.processDue(); toast.success(`${(data as any).processed} transactions processed!`); }
    catch { toast.error("Failed"); }
  };

  const safeRecurrings = Array.isArray(recurrings) ? recurrings : [];

  return (
    <div>
      <PageHeader title="Recurring Transactions" subtitle="Auto-scheduled income & expenses" actions={
        <><button onClick={handleProcess} className="btn-secondary"><Zap size={15}/>Process Due</button><button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={15}/>Add Recurring</button></>
      } />
      {loading ? <LoadingSpinner size="lg" className="py-32" /> : safeRecurrings.length === 0 ? (
        <EmptyState icon={RefreshCw} title="No recurring transactions" description="Add recurring transactions like salary, rent, or subscriptions" />
      ) : (
        <div className="card divide-y divide-gray-100">
          {safeRecurrings.map(r => (
            <div key={r.id} className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: r.categoryColor+"20" }}>{r.categoryIcon}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{r.name}</p>
                    <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">{r.frequency}</span>
                    {!r.active && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Inactive</span>}
                  </div>
                  <p className="text-xs text-gray-400">{r.categoryName} · Next: {r.nextDueDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className={clsx("text-sm font-bold", r.type==="INCOME"?"text-green-600":"text-red-600")}>{r.type==="INCOME"?"+":"-"}€{Number(r.amount).toFixed(2)}</p>
                <button onClick={() => setDeleteR(r)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-base font-semibold text-gray-900">Add Recurring</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              <div className="flex rounded-xl overflow-hidden border border-gray-200">
                {(["INCOME","EXPENSE"] as const).map(t=>(
                  <label key={t} className={clsx("flex-1 py-2.5 text-center text-sm font-medium cursor-pointer",selType===t?(t==="INCOME"?"bg-green-600 text-white":"bg-red-600 text-white"):"bg-white text-gray-500 hover:bg-gray-50")}>
                    <input type="radio" value={t} {...register("type")} className="hidden"/>{t==="INCOME"?"↑ Income":"↓ Expense"}
                  </label>
                ))}
              </div>
              <div><label className="label">Name</label><input {...register("name")} className="input" placeholder="e.g. Spotify Premium"/>{errors.name&&<p className="text-xs text-red-500 mt-1">Required</p>}</div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Amount (€)</label><input type="number" step="0.01" {...register("amount",{valueAsNumber:true})} className="input" placeholder="0.00"/>{errors.amount&&<p className="text-xs text-red-500 mt-1">Required</p>}</div>
                <div><label className="label">Next Due</label><input type="date" {...register("nextDueDate")} className="input"/>{errors.nextDueDate&&<p className="text-xs text-red-500 mt-1">Required</p>}</div>
              </div>
              <div><label className="label">Frequency</label><select {...register("frequency")} className="input">{FREQS.map(f=><option key={f} value={f}>{f}</option>)}</select></div>
              <div><label className="label">Category</label>
                <select {...register("categoryId",{valueAsNumber:true})} className="input"><option value="">Select...</option>{filteredCats.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select>
                {errors.categoryId&&<p className="text-xs text-red-500 mt-1">Required</p>}
              </div>
              <div><label className="label">Note</label><textarea {...register("note")} rows={2} className="input resize-none" placeholder="Optional"/></div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">{isSubmitting?<LoadingSpinner size="sm"/>:"Add"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog isOpen={!!deleteR} title="Delete Recurring" message={`Delete "${deleteR?.name}"?`} onConfirm={handleDelete} onCancel={() => setDeleteR(null)} />
    </div>
  );
};
export default RecurringPage;
