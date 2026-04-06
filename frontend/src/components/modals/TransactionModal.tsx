import React, { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Camera, Leaf, RefreshCw } from "lucide-react";
import { Transaction, Category, BankAccount, TransactionType } from "../../types";
import { categoryService } from "../../services/category.service";
import { bankAccountService } from "../../services/bankAccount.service";
import { recurringService } from "../../services/recurring.service";
import { aiService } from "../../services/ai.service";
import { useAppDispatch } from "../../hooks/useAppDispatch";
import { createTransaction, updateTransaction } from "../../store/slices/transactionSlice";
import toast from "react-hot-toast";
import LoadingSpinner from "../ui/LoadingSpinner";
import clsx from "clsx";

const FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;
type Frequency = typeof FREQUENCIES[number];

const schema = z.object({
  description: z.string().min(1, "Required"),
  amount: z.number({ invalid_type_error: "Enter a number" }).positive("Must be positive"),
  date: z.string().min(1, "Required"),
  type: z.enum(["INCOME", "EXPENSE"]),
  categoryId: z.number({ invalid_type_error: "Select a category" }),
  bankAccountId: z.number().optional().nullable(),
  note: z.string().optional(),
});
type F = z.infer<typeof schema>;

interface Props { isOpen: boolean; transaction?: Transaction | null; onClose: () => void; }

const TransactionModal: React.FC<Props> = ({ isOpen, transaction, onClose }) => {
  const dispatch = useAppDispatch();
  const [categories, setCategories] = useState<Category[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [scanning, setScanning] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>("MONTHLY");
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: { type: "EXPENSE", date: new Date().toISOString().split("T")[0] },
  });
  const selectedType = watch("type");
  const watchedAccountId = watch("bankAccountId");

  useEffect(() => {
    setSelectedAccount(bankAccounts.find(a => a.id === watchedAccountId) || null);
  }, [watchedAccountId, bankAccounts]);

  useEffect(() => {
    if (!isOpen) return;
    categoryService.getAll().then(r => setCategories(r.data)).catch(() => {});
    bankAccountService.getAll().then(r => setBankAccounts(r.data)).catch(() => {});
    if (transaction) {
      reset({
        description: transaction.description, amount: transaction.amount,
        date: transaction.date, type: transaction.type,
        categoryId: transaction.categoryId, bankAccountId: transaction.bankAccountId ?? null,
        note: transaction.note || "",
      });
    } else {
      reset({ type: "EXPENSE", date: new Date().toISOString().split("T")[0], bankAccountId: null });
      setIsRecurring(false);
      setFrequency("MONTHLY");
    }
  }, [isOpen, transaction, reset]);

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setScanning(true);
    try {
      const { data } = await aiService.scanReceipt(file);
      const extracted = data.extracted;
      if (extracted) {
        if (extracted.description) setValue("description", extracted.description);
        if (extracted.amount) setValue("amount", extracted.amount);
        if (extracted.date) setValue("date", extracted.date);
        setValue("type", "EXPENSE");
        const match = categories.find(c => c.name.toLowerCase().includes((extracted.category || "").toLowerCase()));
        if (match) setValue("categoryId", match.id);
        toast.success(data.source === "gemini" ? "📷 Receipt scanned!" : "📷 Demo data filled");
      }
    } catch { toast.error("Could not scan receipt"); }
    finally { setScanning(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const filteredCats = categories.filter(c => c.type === selectedType);
  const currencyLabel = selectedAccount ? `Amount (${selectedAccount.currencyCode})` : "Amount";

  const onSubmit = async (data: F) => {
    try {
      const payload = { ...data, bankAccountId: data.bankAccountId || undefined };

      if (transaction) {
        await dispatch(updateTransaction({ id: transaction.id, req: payload })).unwrap();
        toast.success("Transaction updated!");
      } else {
        const created = await dispatch(createTransaction(payload)).unwrap();
        toast.success("Transaction added!");

        // If recurring is toggled — also create a recurring entry
        if (isRecurring) {
          try {
            await recurringService.create({
              name: data.description,
              amount: data.amount,
              type: data.type,
              frequency,
              nextDueDate: data.date,
              categoryId: data.categoryId,
              bankAccountId: data.bankAccountId || null,
              note: data.note || "",
            });
            toast.success(`🔁 Recurring ${frequency.toLowerCase()} transaction set up!`);
          } catch {
            toast.error("Transaction saved but recurring setup failed");
          }
        }
      }
      onClose();
    } catch { toast.error("Something went wrong"); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md animate-fade-in max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">
            {transaction ? "Edit Transaction" : "Add Transaction"}
          </h2>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleReceiptScan} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={scanning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              {scanning ? <LoadingSpinner size="sm" /> : <Camera size={14} />}
              {scanning ? "Scanning..." : "Scan Receipt"}
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Income / Expense toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            {(["INCOME", "EXPENSE"] as TransactionType[]).map(t => (
              <label key={t} className={clsx(
                "flex-1 py-2.5 text-center text-sm font-medium cursor-pointer transition-colors",
                selectedType === t
                  ? (t === "INCOME" ? "bg-green-600 text-white" : "bg-red-600 text-white")
                  : "bg-white text-gray-500 hover:bg-gray-50"
              )}>
                <input type="radio" value={t} {...register("type")} className="hidden" />
                {t === "INCOME" ? "↑ Income" : "↓ Expense"}
              </label>
            ))}
          </div>

          {/* Description */}
          <div>
            <label className="label">Description *</label>
            <input {...register("description")} className="input" placeholder="e.g. Coffee at Costa" />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
          </div>

          {/* Bank Account */}
          <div>
            <label className="label">Bank Account</label>
            <select {...register("bankAccountId", { valueAsNumber: true })} className="input">
              <option value="">— No specific account —</option>
              {bankAccounts.map(a => (
                <option key={a.id} value={a.id}>{a.icon} {a.name} ({a.currencyCode})</option>
              ))}
            </select>
            {selectedAccount && (
              <p className="text-xs text-primary-600 mt-1 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: selectedAccount.color }} />
                {selectedAccount.currencyCode} — {selectedAccount.name}
              </p>
            )}
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{currencyLabel} *</label>
              <input type="number" step="0.01" {...register("amount", { valueAsNumber: true })} className="input" placeholder="0.00" />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="label">Date *</label>
              <input type="date" {...register("date")} className="input" />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="label">Category *</label>
            <select {...register("categoryId", { valueAsNumber: true })} className="input">
              <option value="">Select category</option>
              {filteredCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            {errors.categoryId && <p className="text-xs text-red-500 mt-1">{errors.categoryId.message}</p>}
          </div>

          {/* CO2 hint */}
          {selectedType === "EXPENSE" && (
            <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 flex items-center gap-1.5">
              <Leaf size={12} /> CO₂ footprint will be calculated automatically based on category
            </p>
          )}

          {/* Note */}
          <div>
            <label className="label">Note</label>
            <textarea {...register("note")} rows={2} className="input resize-none" placeholder="Optional note..." />
          </div>

          {/* ✅ Make Recurring toggle — only shown when creating a new transaction */}
          {!transaction && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setIsRecurring(v => !v)}
                className={clsx(
                  "w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors",
                  isRecurring ? "bg-indigo-50 text-indigo-700" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                )}
              >
                <span className="flex items-center gap-2">
                  <RefreshCw size={15} />
                  Make this a recurring transaction
                </span>
                <span className={clsx(
                  "w-9 h-5 rounded-full transition-colors relative",
                  isRecurring ? "bg-indigo-600" : "bg-gray-300"
                )}>
                  <span className={clsx(
                    "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                    isRecurring ? "translate-x-4" : "translate-x-0.5"
                  )} />
                </span>
              </button>

              {/* Frequency selector — revealed when toggle is ON */}
              {isRecurring && (
                <div className="px-4 py-3 bg-indigo-50/60 border-t border-indigo-100">
                  <label className="label text-indigo-700">Repeat every</label>
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    {FREQUENCIES.map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFrequency(f)}
                        className={clsx(
                          "py-2 rounded-lg text-xs font-semibold border transition-colors",
                          frequency === f
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                        )}
                      >
                        {f.charAt(0) + f.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-indigo-600 mt-2">
                    🔁 A recurring entry will be created automatically starting {watch("date") || "today"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? <LoadingSpinner size="sm" /> : transaction ? "Update" : "Add Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
