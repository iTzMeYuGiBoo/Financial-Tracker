import React, { useEffect, useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import MonthlyTrendChart from "../components/charts/MonthlyTrendChart";
import CategoryPieChart from "../components/charts/CategoryPieChart";
import CashFlowChart from "../components/charts/CashFlowChart";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { useAppSelector, useAppDispatch } from "../hooks/useAppDispatch";
import api from "../services/api";
import { BankAccount, DashboardStats, CashFlowForecast, NetWorth, Category } from "../types";
import { bankAccountService } from "../services/bankAccount.service";
import { categoryService } from "../services/category.service";
import { createTransaction } from "../store/slices/transactionSlice";
import { FileText, AlertTriangle, Plus, X } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import clsx from "clsx";

interface CombinedDashboard {
  stats: DashboardStats;
  cashFlow: CashFlowForecast;
  netWorth: NetWorth;
}

interface BudgetAlert {
  id: number;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  month: number;
  year: number;
  percentage: number;
  remainingAmount: number;
  limitAmount: number;
  status: "APPROACHING" | "OVER";
}

interface QuickTxForm {
  description: string;
  amount: string;
  type: "INCOME" | "EXPENSE";
  categoryId: string;
  date: string;
}

const DashboardPage: React.FC = () => {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | "ALL">("ALL");
  const [data, setData] = useState<CombinedDashboard | null>(null);
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<QuickTxForm>({
    defaultValues: {
      type: "EXPENSE",
      date: new Date().toISOString().slice(0, 10),
    },
  });
  const selType = watch("type");
  const filteredCats = categories.filter((c) => c.type === selType);

  const loadAccounts = async () => {
    try {
      const res = await bankAccountService.getAll();
      setAccounts(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAccounts([]);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await categoryService.getAll();
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch {
      setCategories([]);
    }
  };

  const loadDashboard = async (accountId: number | "ALL") => {
    setLoading(true);
    try {
      const param = accountId === "ALL" ? "" : `?bankAccountId=${accountId}`;
      const [statsRes, cashFlowRes, netWorthRes, alertsRes] = await Promise.all([
        api.get(`/dashboard/stats${param}`),
        api.get(`/dashboard/cash-flow-forecast${param}`),
        api.get(`/dashboard/net-worth${param}`),
        api.get("/budgets/alerts"),
      ]);
      setData({
        stats: statsRes.data,
        cashFlow: cashFlowRes.data,
        netWorth: netWorthRes.data,
      });
      const alertsData = alertsRes.data;
      setAlerts(
        Array.isArray(alertsData)
          ? alertsData
          : Array.isArray(alertsData?.alerts)
          ? alertsData.alerts
          : []
      );
    } catch {
      setAlerts([]);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    loadCategories();
  }, []);

  useEffect(() => {
    loadDashboard(selectedAccountId);
  }, [selectedAccountId]);

  const handleQuickAdd = async (form: QuickTxForm) => {
    if (!form.categoryId) { toast.error("Please select a category"); return; }
    setSubmitting(true);
    try {
      await dispatch(
        createTransaction({
          description: form.description,
          amount: parseFloat(form.amount),
          type: form.type,
          categoryId: Number(form.categoryId),
          date: form.date,
        })
      ).unwrap();
      toast.success(`${form.type === "INCOME" ? "Income" : "Expense"} added! 🎉`);
      reset({ type: "EXPENSE", date: new Date().toISOString().slice(0, 10) });
      setShowQuickAdd(false);
      loadDashboard(selectedAccountId);
    } catch (e: any) {
      toast.error(e || "Failed to add transaction");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      const root = document.getElementById("dashboard-export-root");
      if (!root) return;
      const canvas = await html2canvas(root, { scale: 2, backgroundColor: "#f8fafc" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
      const imgWidth = canvas.width * ratio;
      const imgHeight = canvas.height * ratio;
      pdf.addImage(imgData, "PNG", (pageWidth - imgWidth) / 2, 20, imgWidth, imgHeight);
      pdf.save("finance-dashboard.pdf");
      toast.success("Dashboard exported as PDF");
    } catch {
      toast.error("Failed to export PDF");
    }
  };

  if (loading || !data) return <LoadingSpinner size="lg" className="py-16" />;

  const { stats, cashFlow } = data;
  const greetingName = user?.firstName || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const monthName = new Date().toLocaleString("default", { month: "long" });

  return (
    <div id="dashboard-export-root" className="space-y-5">
      <PageHeader
        title={`${greeting}, ${greetingName} 👋`}
        subtitle={
          selectedAccountId === "ALL"
            ? "Overview across all of your accounts."
            : "Insights for a single account."
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <select
              className="select text-xs min-w-[160px]"
              value={selectedAccountId === "ALL" ? "ALL" : String(selectedAccountId)}
              onChange={(e) =>
                setSelectedAccountId(
                  e.target.value === "ALL" ? "ALL" : Number(e.target.value)
                )
              }
            >
              <option value="ALL">All accounts</option>
              {Array.isArray(accounts) &&
                accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.icon} {a.name}
                  </option>
                ))}
            </select>
            <button
              onClick={() => setShowQuickAdd(true)}
              className="btn-primary text-xs"
            >
              <Plus size={14} /> New Transaction
            </button>
            <button
              onClick={handleExportPdf}
              className="btn-secondary text-xs hidden sm:inline-flex"
            >
              <FileText size={14} /> Export PDF
            </button>
          </div>
        }
      />

      {/* Budget Alerts */}
      {Array.isArray(alerts) && alerts.length > 0 && (
        <div className="card p-4 flex flex-col gap-2 border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-900/10">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={16} />
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                Budget alerts — {monthName}
              </p>
            </div>
            <span className="text-[11px] text-amber-600 dark:text-amber-400">{alerts.length} at risk</span>
          </div>
          <div className="space-y-1.5">
            {alerts.map((b) => (
              <div key={b.id} className="flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center text-base" style={{ backgroundColor: b.categoryColor + "20" }}>
                    {b.categoryIcon}
                  </span>
                  <span className="font-medium">{b.categoryName}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{Math.round(b.percentage)}% used</p>
                  <p className="text-[11px]">{b.status === "OVER" ? "Over by" : "Remaining"} €{Math.abs(b.remainingAmount).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Income (this month)" value={stats.totalIncome} trend="Stable" variant="positive" />
        <StatCard label="Expenses (this month)" value={stats.totalExpenses} trend="Track budgets" variant="negative" />
        <StatCard label="Net balance" value={stats.balance} trend={stats.balance >= 0 ? "On track" : "Over budget"} variant={stats.balance >= 0 ? "positive" : "negative"} />
        <StatCard label="Savings rate" value={`${stats.savingsRate}%`} trend="Target: 20%+" variant="neutral" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-4 lg:col-span-2">
          <MonthlyTrendChart data={stats.monthlyTrend} />
        </div>
        <div className="card p-4">
          <CategoryPieChart data={stats.topCategories} />
        </div>
      </div>

      <div className="card p-4">
        <CashFlowChart data={cashFlow.dailyForecast} />
      </div>

      {/* Quick Add Transaction Modal */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowQuickAdd(false)} />
          <div className="relative bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-sm animate-fade-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <Plus size={16} className="text-indigo-500" /> New Transaction
              </h2>
              <button onClick={() => setShowQuickAdd(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(handleQuickAdd)} className="p-5 space-y-4">
              {/* Income / Expense toggle */}
              <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                {(["INCOME", "EXPENSE"] as const).map((t) => (
                  <label
                    key={t}
                    className={clsx(
                      "flex-1 py-2.5 text-center text-sm font-medium cursor-pointer transition-colors",
                      selType === t
                        ? t === "INCOME" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                        : "bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <input type="radio" value={t} {...register("type")} className="hidden" />
                    {t === "INCOME" ? "↑ Income" : "↓ Expense"}
                  </label>
                ))}
              </div>

              <div>
                <label className="label">Description *</label>
                <input {...register("description", { required: true })} className="input" placeholder="e.g. Coffee at Starbucks" />
                {errors.description && <p className="text-xs text-red-500 mt-1">Required</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount (€) *</label>
                  <input type="number" step="0.01" min="0.01" {...register("amount", { required: true, min: 0.01 })} className="input" placeholder="0.00" />
                  {errors.amount && <p className="text-xs text-red-500 mt-1">Required</p>}
                </div>
                <div>
                  <label className="label">Date *</label>
                  <input type="date" {...register("date", { required: true })} className="input" />
                </div>
              </div>

              <div>
                <label className="label">Category *</label>
                <select {...register("categoryId", { required: true })} className="input">
                  <option value="">Select category...</option>
                  {filteredCats.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
                {errors.categoryId && <p className="text-xs text-red-500 mt-1">Required</p>}
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowQuickAdd(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1">
                  {submitting ? "Adding..." : "Add Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
