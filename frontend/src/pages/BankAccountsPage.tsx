import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Landmark, Plus, Trash2, X } from "lucide-react";
import { BankAccount } from "../types";
import { bankAccountService } from "../services/bankAccount.service";
import PageHeader from "../components/ui/PageHeader";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import toast from "react-hot-toast";

const CURRENCIES = [
  { code:"EUR",symbol:"€",name:"Euro",flag:"🇪🇺" },
  { code:"GBP",symbol:"£",name:"British Pound",flag:"🇬🇧" },
  { code:"USD",symbol:"$",name:"US Dollar",flag:"🇺🇸" },
  { code:"INR",symbol:"₹",name:"Indian Rupee",flag:"🇮🇳" },
  { code:"JPY",symbol:"¥",name:"Japanese Yen",flag:"🇯🇵" },
  { code:"CAD",symbol:"C$",name:"Canadian Dollar",flag:"🇨🇦" },
  { code:"AUD",symbol:"A$",name:"Australian Dollar",flag:"🇦🇺" },
  { code:"CHF",symbol:"Fr",name:"Swiss Franc",flag:"🇨🇭" },
  { code:"CNY",symbol:"¥",name:"Chinese Yuan",flag:"🇨🇳" },
  { code:"AED",symbol:"د.إ",name:"UAE Dirham",flag:"🇦🇪" },
  { code:"NGN",symbol:"₦",name:"Nigerian Naira",flag:"🇳🇬" },
  { code:"BRL",symbol:"R$",name:"Brazilian Real",flag:"🇧🇷" },
  { code:"SGD",symbol:"S$",name:"Singapore Dollar",flag:"🇸🇬" },
  { code:"SEK",symbol:"kr",name:"Swedish Krona",flag:"🇸🇪" },
  { code:"PLN",symbol:"zł",name:"Polish Zloty",flag:"🇵🇱" },
  { code:"TRY",symbol:"₺",name:"Turkish Lira",flag:"🇹🇷" },
];
const COLORS = ["#3B82F6","#10B981","#8B5CF6","#F97316","#EF4444","#EC4899","#14B8A6","#F59E0B","#6366F1","#84CC16"];
const ICONS  = ["🏦","💳","💰","🏧","💵","🏛️","💼","🌍","🏠","⭐"];

const schema = z.object({
  name: z.string().min(1,"Required"),
  currencyCode: z.string().min(3),
  icon: z.string(),
  color: z.string(),
  currentBalance: z.string().optional().transform((v) => (v&&v.trim().length ? Number(v) : 0)).refine((v) => !Number.isNaN(v),{message:"Must be a number"}),
});
type F = z.infer<typeof schema>;

const BankAccountsPage: React.FC = () => {
  const [accounts, setAccounts]     = useState<BankAccount[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [deleteAcc, setDeleteAcc]   = useState<BankAccount | null>(null);
  const [currSearch, setCurrSearch] = useState("");

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: { icon:"🏦", color:"#3B82F6", currencyCode:"EUR", currentBalance: 0 },
  });
  const selectedCurr  = watch("currencyCode");
  const selectedColor = watch("color");
  const selectedIcon  = watch("icon");

  const load = async () => {
    setLoading(true);
    try { const { data } = await bankAccountService.getAll(); setAccounts(Array.isArray(data) ? data : []); }
    catch { setAccounts([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filteredCurrs = CURRENCIES.filter(c =>
    c.code.toLowerCase().includes(currSearch.toLowerCase()) || c.name.toLowerCase().includes(currSearch.toLowerCase())
  );

  const onSubmit = async (data: F) => {
    try { await bankAccountService.create({ name:data.name, icon:data.icon, color:data.color, currencyCode:data.currencyCode, currentBalance:data.currentBalance }); toast.success("Account added!"); reset(); setShowModal(false); setCurrSearch(""); load(); }
    catch { toast.error("Failed to add account"); }
  };
  const handleDelete = async () => {
    if (!deleteAcc) return;
    try { await bankAccountService.delete(deleteAcc.id); toast.success("Deleted"); }
    catch { toast.error("Failed to delete"); }
    setDeleteAcc(null); load();
  };

  const safeAccounts = Array.isArray(accounts) ? accounts : [];
  const totalBalance  = safeAccounts.reduce((sum,a) => sum + (Number(a.currentBalance)||0), 0);

  return (
    <div>
      <PageHeader title="Bank Accounts" subtitle="Manage your accounts and starting balances." actions={<button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={15}/> Add Account</button>} />
      {safeAccounts.length > 0 && (
        <div className="mb-4 text-xs text-gray-500 flex items-center justify-between">
          <span>You have {safeAccounts.length} account{safeAccounts.length>1?"s":""}.</span>
          <span>Total starting balance: <span className="font-semibold">€{totalBalance.toFixed(2)}</span></span>
        </div>
      )}
      {loading ? <LoadingSpinner size="lg" className="py-32" /> : safeAccounts.length === 0 ? (
        <EmptyState icon={Landmark} title="No bank accounts" description="Add your first account to start tracking." action={<button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={15}/> Add Account</button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {safeAccounts.map(acc => (
            <div key={acc.id} className="card p-5 relative group">
              <button onClick={() => setDeleteAcc(acc)} className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: acc.color+"20" }}>{acc.icon}</div>
                <div><p className="font-semibold text-gray-900 text-sm">{acc.name}</p><p className="text-xs text-gray-400">{acc.country||"Global"}</p></div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <div><p className="text-[11px] text-gray-400 uppercase tracking-wide">Currency</p><p className="text-sm font-semibold text-gray-900">{acc.currencySymbol} <span className="text-gray-500 text-xs">{acc.currencyCode}</span></p></div>
                <div className="text-right"><p className="text-[11px] text-gray-400 uppercase tracking-wide">Balance</p><p className="text-sm font-semibold text-gray-900">{acc.currencySymbol}{Number(acc.currentBalance||0).toFixed(2)}</p></div>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Added on {new Date(acc.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowModal(false); setCurrSearch(""); }} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md animate-fade-in max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-base font-semibold text-gray-900">Add Bank Account</h2>
              <button onClick={() => { setShowModal(false); setCurrSearch(""); }} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18}/></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              <div><label className="label">Account Name *</label><input {...register("name")} className="input" placeholder="e.g. AIB Current Account"/>{errors.name&&<p className="text-xs text-red-500 mt-1">Required</p>}</div>
              <div>
                <label className="label">Currency *</label>
                <input value={currSearch} onChange={e=>setCurrSearch(e.target.value)} className="input mb-2" placeholder="Search currency..."/>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {filteredCurrs.map(c=>(
                    <button type="button" key={c.code} onClick={() => { setValue("currencyCode",c.code); setCurrSearch(c.code); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 text-left transition-colors ${selectedCurr===c.code?"bg-primary-50 text-primary-700":""}`}>
                      <span className="text-xl">{c.flag}</span><span className="font-semibold">{c.code}</span><span className="text-gray-500 text-xs">{c.name}</span><span className="ml-auto text-gray-400">{c.symbol}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="label">Current balance</label>
                <div className="relative"><input {...register("currentBalance" as const)} className="input pr-10" placeholder="e.g. 1250.00"/><span className="absolute inset-y-0 right-3 flex items-center text-xs text-gray-400">{selectedCurr||"EUR"}</span></div>
                {errors.currentBalance&&<p className="text-xs text-red-500 mt-1">{String(errors.currentBalance.message)}</p>}
              </div>
              <div><label className="label">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map(i=><button type="button" key={i} onClick={() => setValue("icon",i)} className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${selectedIcon===i?"ring-2 ring-primary-500 bg-primary-50":"hover:bg-gray-100"}`}>{i}</button>)}
                </div>
              </div>
              <div><label className="label">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c=><button type="button" key={c} onClick={() => setValue("color",c)} className={`w-8 h-8 rounded-lg transition-all ${selectedColor===c?"ring-2 ring-offset-2 ring-gray-400 scale-110":""}`} style={{ backgroundColor: c }}/>)}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowModal(false); setCurrSearch(""); }} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">{isSubmitting?<LoadingSpinner size="sm"/>:"Add Account"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog isOpen={!!deleteAcc} title="Delete Account" message={`Delete "${deleteAcc?.name}"? This won't delete existing transactions.`} onConfirm={handleDelete} onCancel={() => setDeleteAcc(null)} />
    </div>
  );
};
export default BankAccountsPage;
