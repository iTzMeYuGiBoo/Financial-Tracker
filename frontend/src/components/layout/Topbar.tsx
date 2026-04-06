import React, { useEffect, useState } from "react";
import { Moon, Sun, Bell } from "lucide-react";
import { useAppSelector } from "../../hooks/useAppDispatch";
import toast from "react-hot-toast";

const Topbar: React.FC = () => {
  const user = useAppSelector((s) => s.auth.user);
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    (localStorage.getItem("ft-theme") as "light" | "dark") || "light"
  );

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("ft-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`
    : "?";

  return (
    <header className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 z-10">
      <div>
        <h1 className="text-base font-bold text-slate-900 dark:text-slate-50 tracking-tight">
          Personal Finance Tracker
        </h1>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Stay on top of your money, savings and carbon footprint.
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button
          onClick={() => toast("Notifications coming soon ✨", { icon: "🔔" })}
          className="relative h-9 w-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-colors"
        >
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-950" />
        </button>

        {/* Dark/Light toggle */}
        <button
          onClick={toggle}
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-yellow-300 transition-colors"
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* User avatar */}
        <div className="h-9 px-3 flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-semibold shadow-sm">
          <div className="h-6 w-6 rounded-lg bg-white/20 flex items-center justify-center text-[11px] font-bold">
            {initials}
          </div>
          <span className="hidden sm:block max-w-[100px] truncate">
            Hi, {user?.firstName ?? "Guest"}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
