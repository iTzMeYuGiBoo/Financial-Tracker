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
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={clsx(
          "fixed top-0 left-0 h-full w-60 bg-white border-r border-gray-100 z-30 flex flex-col transition-transform duration-300",
          "lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">FinanceTracker</p>
              <p className="text-xs text-gray-400">Smart Money</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <X size={16} className="text-gray-500" />
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
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-2 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gray-50 mb-1.5">
            <div className="w-7 h-7 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-primary-700 text-xs font-bold uppercase">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => { dispatch(logout()); navigate("/login"); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
