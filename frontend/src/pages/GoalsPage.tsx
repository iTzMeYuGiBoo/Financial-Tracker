import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trophy, Plus, Trash2, X, PlusCircle } from "lucide-react";
import { SavingsGoal } from "../types";
import { goalService } from "../services/goal.service";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import toast from "react-hot-toast";

const ICONS   = ["🎯","✈️","🏠","🚗","💍","📱","💻","🎓","🌴","💰","🏋️","🎸","🐕","🎮"];
const COLORS  = ["#6366F1","#10B981","#3B82F6","#F97316","#EC4899","#8B5CF6","#14B8A6","#EF4444"];
const schema  = z.object({ name: z.string().min(1), icon: z.string(), color: z.string(), targetAmount: z.number().positive(), currentAmount: z.number().min(0), targetDate: z.string().optional() });
type F = z.infer<typeof schema>;

const GoalsPage: React.FC = () => {
  const [goals, setGoals]               = useState<SavingsGoal[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [deleteGoal, setDeleteGoal]     = useState<SavingsGoal | null>(null);
  const [contributeGoal, setContributeGoal] = useState<SavingsGoal | null>(null);
  const [contributeAmount, setContributeAmount] = useState("");

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: { icon: "🎯", color: "#6366F1", currentAmount: 0 }
  });
  const selColor = watch("color"); const selIcon = watch("icon");

  const load = async () => {
    setLoading(true);
    try { const { data } = await goalService.getAll(); setGoals(Array.isArray(data) ? data : []); }
    catch { setGoals([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (data: F) => {
    try { await goalService.create(data); toast.success("Goal created!"); reset(); setShowModal(false); load(); }
    catch { toast.error("Failed"); }
  };
  const handleDelete = async () => {
    if (!deleteGoal) return;
    try { await goalService.delete(deleteGoal.id); toast.success("Deleted"); }
    catch { toast.error("Failed to delete"); }
    setDeleteGoal(null); load();
  };
  const handleContribute = async () => {
    if (!contributeGoal || !contributeAmount) return;
    try { await goalService.contribute(contributeGoal.id, parseFloat(contributeAmount)); toast.success("Contribution added! 🎉"); setContributeGoal(null); setContributeAmount(""); load(); }
    catch { toast.error("Failed"); }
  };

  const safeGoals = Array.isArray(goals) ? goals : [];

  return (
    <div>
      <PageHeader title="Savings Goals" subtitle="Track your financial goals" actions={<button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={15} />New Goal</button>} />
      {loading ? <LoadingSpinner size="lg" className="py-32" /> : safeGoals.length === 0 ? (
        <EmptyState icon={Trophy} title="No goals yet" description="Set a savings goal to stay motivated" action={<button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={15} />Create Goal</button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {safeGoals.map(g => (
            <div key={g.id} className="card p-5 relative group">
              {g.completed && <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">✓ Completed</div>}
              <button onClick={() => setDeleteGoal(g)} className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
              <div className="flex items-center gap-3 mb-4 mt-1">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: g.color+"20" }}>{g.icon}</div>
                <div><p className="font-semibold text-gray-900">{g.name}</p>{g.targetDate && <p className="text-xs text-gray-400">By {g.targetDate}</p>}</div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Progress</span><span className="font-semibold text-gray-900">{Number(g.progressPercentage||0).toFixed(0)}%</span></div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width:`${Math.min(Number(g.progressPercentage)||0,100)}%`, backgroundColor: g.color }} /></div>
                <div className="flex justify-between text-xs text-gray-400"><span>€{Number(g.currentAmount||0).toFixed(0)} saved</span><span>€{Number(g.targetAmount||0).toFixed(0)} goal</span></div>
              </div>
              {!g.completed && <button onClick={() => setContributeGoal(g)} className="w-full mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 py-2 rounded-xl transition-colors"><PlusCircle size={13} />Add Contribution</button>}
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm animate-fade-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">New Savings Goal</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              <div><label className="label">Goal Name</label><input {...register("name")} className="input" placeholder="e.g. Holiday to Japan" />{errors.name && <p className="text-xs text-red-500 mt-1">Required</p>}</div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Target Amount (€)</label><input type="number" step="0.01" {...register("targetAmount",{valueAsNumber:true})} className="input" placeholder="5000" />{errors.targetAmount && <p className="text-xs text-red-500 mt-1">Required</p>}</div>
                <div><label className="label">Current Savings</label><input type="number" step="0.01" {...register("currentAmount",{valueAsNumber:true})} className="input" placeholder="0" /></div>
              </div>
              <div><label className="label">Target Date</label><input type="date" {...register("targetDate")} className="input" /></div>
              <div><label className="label">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map(i => <button type="button" key={i} onClick={() => setValue("icon",i)} className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center ${selIcon===i?"ring-2 ring-primary-500 bg-primary-50":"hover:bg-gray-100"}`}>{i}</button>)}
                </div>
              </div>
              <div><label className="label">Color</label>
                <div className="flex gap-2">
                  {COLORS.map(c => <button type="button" key={c} onClick={() => setValue("color",c)} className={`w-8 h-8 rounded-lg ${selColor===c?"ring-2 ring-offset-2 ring-gray-400":""}`} style={{ backgroundColor: c }} />)}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">{isSubmitting?<LoadingSpinner size="sm" />:"Create Goal"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {contributeGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setContributeGoal(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xs animate-fade-in p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Add to "{contributeGoal.name}"</h3>
            <input type="number" step="0.01" value={contributeAmount} onChange={e => setContributeAmount(e.target.value)} className="input mb-4" placeholder="Amount (€)" autoFocus />
            <div className="flex gap-3"><button onClick={() => setContributeGoal(null)} className="btn-secondary flex-1 justify-center">Cancel</button><button onClick={handleContribute} className="btn-primary flex-1 justify-center">Add</button></div>
          </div>
        </div>
      )}
      <ConfirmDialog isOpen={!!deleteGoal} title="Delete Goal" message={`Delete "${deleteGoal?.name}"?`} onConfirm={handleDelete} onCancel={() => setDeleteGoal(null)} />
    </div>
  );
};
export default GoalsPage;
