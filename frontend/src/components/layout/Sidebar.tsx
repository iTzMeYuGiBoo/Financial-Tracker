import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ArrowRightLeft, Target, Tag, Sparkles,
  TrendingUp, LogOut, X, Trophy, RefreshCw, Landmark,
  Heart, DollarSign, Leaf, CalendarRange,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../hooks/useAppDispatch";
import { logout } from "../../store/slices/authSlice";
import clsx from "clsx";

const navItems = [
  { to: "/dashboard",     icon: LayoutDashboard, label: "Dashboard" },
  { to: "/transactions",  icon: ArrowRightLeft,  label: "Transactions" },
  { to: "/bank-accounts", icon: Landmark,        label: "Bank Accounts" },
  { to: "/budgets",       icon: Target,          label: "Budgets" },
  { to: "/goals",         icon: Trophy,          label: "Savings Goals" },
  { to: "/recurring",     icon: RefreshCw,       label: "Recurring" },
  { to: "/net-worth",     icon: DollarSign,      label: "Net Worth" },
  { to: "/health-score",  icon: Heart,           label: "Health Score" },
  { to: "/carbon",        icon: Leaf,            label: "Carbon Footprint" },
  { to: "/categories",    icon: Tag,             label: "Categories" },
  { to: "/ai-insights",   icon: Sparkles,        label: "AI Insights" },
  { to: "/income",        icon: TrendingUp,      label: "Income Analytics" },
  { to: "/review",        icon: CalendarRange,   label: "Monthly Review" },
];

interface Props { open?: boolean; onClose?: () => void; }

const Sidebar: React.FC<Props> = ({ open = true, onClose = () => {} }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={clsx(
          "fixed top-0 left-0 h-full w-60 z-30 flex flex-col transition-transform duration-300",
          "bg-white dark:bg-slate-950",
          "border-r border-slate-100 dark:border-slate-800",
          "lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-50">FinanceTracker</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Smart Money</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100"
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-2 py-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 mb-1.5">
            <div className="w-7 h-7 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-50 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => { dispatch(logout()); navigate("/login"); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
