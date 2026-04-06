import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tag, Plus, Trash2, X } from "lucide-react";
import { Category } from "../types";
import { categoryService } from "../services/category.service";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import toast from "react-hot-toast";
import clsx from "clsx";

const COLORS = ["#10B981","#3B82F6","#8B5CF6","#EF4444","#F97316","#EC4899","#14B8A6","#EAB308","#6366F1","#84CC16","#F59E0B","#06B6D4"];
const ICONS  = ["🍽️","🚗","🏠","🛍️","🎬","🏥","⚡","💼","💻","✈️","🎓","💰","🏋️","🐕","🎮","📱","🎸","🌴","☕","🍕","📚","🎯","💊","🛁","👗"];
const schema = z.object({ name: z.string().min(1), icon: z.string(), color: z.string(), type: z.enum(["INCOME","EXPENSE"]) });
type F = z.infer<typeof schema>;

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [deleteCat, setDeleteCat]   = useState<Category | null>(null);
  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: { type: "EXPENSE", icon: "🎯", color: "#3B82F6" }
  });
  const selColor = watch("color"); const selIcon = watch("icon"); const selType = watch("type");

  const load = async () => {
    setLoading(true);
    try { const { data } = await categoryService.getAll(); setCategories(Array.isArray(data) ? data : []); }
    catch { setCategories([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (data: F) => {
    try { await categoryService.create(data); toast.success("Category added!"); reset({ type: "EXPENSE", icon: "🎯", color: "#3B82F6" }); setShowModal(false); load(); }
    catch (e: any) { toast.error(e.response?.data?.error || "Failed"); }
  };
  const handleDelete = async () => {
    if (!deleteCat) return;
    try { await categoryService.delete(deleteCat.id); toast.success("Deleted"); }
    catch { toast.error("Failed to delete"); }
    setDeleteCat(null); load();
  };

  const safeCats = Array.isArray(categories) ? categories : [];
  const income   = safeCats.filter(c => c.type === "INCOME");
  const expense  = safeCats.filter(c => c.type === "EXPENSE");

  const CategoryGroup = ({ title, cats, color }: { title: string; cats: Category[]; color: string }) => (
    <div>
      <h3 className={clsx("text-xs font-bold uppercase tracking-widest mb-3", color)}>{title}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {cats.map(cat => (
          <div key={cat.id} className="card p-3.5 relative group flex flex-col items-center text-center gap-1.5">
            <button onClick={() => setDeleteCat(cat)} className="absolute top-1.5 right-1.5 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12} /></button>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: cat.color + "20" }}>{cat.icon}</div>
            <p className="text-xs font-medium text-gray-700 leading-tight">{cat.name}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Categories" subtitle="Organise your income and expenses" actions={<button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={15} />Add Category</button>} />
      {loading ? <LoadingSpinner size="lg" className="py-32" /> : safeCats.length === 0 ? (
        <EmptyState icon={Tag} title="No categories" description="Add your first category" />
      ) : (
        <div className="space-y-8">
          {income.length  > 0 && <CategoryGroup title="Income Categories"  cats={income}  color="text-green-600" />}
          {expense.length > 0 && <CategoryGroup title="Expense Categories" cats={expense} color="text-red-600" />}
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-base font-semibold text-gray-900">New Category</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              <div className="flex rounded-xl overflow-hidden border border-gray-200">
                {(["INCOME","EXPENSE"] as const).map(t => (
                  <label key={t} className={clsx("flex-1 py-2.5 text-center text-sm font-medium cursor-pointer", selType===t?(t==="INCOME"?"bg-green-600 text-white":"bg-red-600 text-white"):"bg-white text-gray-500 hover:bg-gray-50")}>
                    <input type="radio" value={t} {...register("type")} className="hidden" />{t==="INCOME"?"↑ Income":"↓ Expense"}
                  </label>
                ))}
              </div>
              <div><label className="label">Name</label><input {...register("name")} className="input" placeholder="e.g. Gym" />{errors.name && <p className="text-xs text-red-500 mt-1">Required</p>}</div>
              <div><label className="label">Icon</label>
                <div className="flex flex-wrap gap-1.5">
                  {ICONS.map(i => <button type="button" key={i} onClick={() => setValue("icon",i)} className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${selIcon===i?"ring-2 ring-primary-500 bg-primary-50":"hover:bg-gray-100"}`}>{i}</button>)}
                </div>
              </div>
              <div><label className="label">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c => <button type="button" key={c} onClick={() => setValue("color",c)} className={`w-8 h-8 rounded-lg ${selColor===c?"ring-2 ring-offset-2 ring-gray-400":""}`} style={{ backgroundColor: c }} />)}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">{isSubmitting ? <LoadingSpinner size="sm" /> : "Add"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog isOpen={!!deleteCat} title="Delete Category" message={`Delete "${deleteCat?.name}"?`} onConfirm={handleDelete} onCancel={() => setDeleteCat(null)} />
    </div>
  );
};
export default CategoriesPage;
