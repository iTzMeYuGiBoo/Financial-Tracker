import React from "react";
import { Bell, User2 } from "lucide-react";
import { useAppSelector } from "../../hooks/useAppDispatch";
import toast from "react-hot-toast";

const Topbar: React.FC = () => {
  const user = useAppSelector((s) => s.auth.user);

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 tracking-tight">
          Personal Finance Tracker
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Stay on top of your money, savings and carbon footprint.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => toast("Notifications coming soon ✨", { icon: "🔔" })}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
        >
          <Bell size={16} />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-white" />
        </button>
        <div className="inline-flex items-center gap-2 h-9 px-3 rounded-full bg-gradient-to-r from-primary-500 to-violet-500 text-white text-xs font-medium shadow-sm">
          <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center">
            <User2 size={14} />
          </div>
          <span className="max-w-[120px] truncate">
            Hi, {user?.firstName || "Guest"}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
