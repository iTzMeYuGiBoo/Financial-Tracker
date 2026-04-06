import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface DataPoint { month: string; income: number; expense: number; }
interface Props { data: DataPoint[]; }

const MonthlyTrendChart: React.FC<Props> = ({ data }) => {
  const safe = Array.isArray(data) ? data : [];

  if (safe.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-56 text-slate-400 gap-2">
        <span className="text-3xl">📊</span>
        <p className="text-sm font-medium">No trend data yet</p>
        <p className="text-xs">Add transactions to see your monthly trend</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Income vs Expenses</p>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={safe} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `€${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
            />
            <Tooltip
              formatter={(v: any) => [`€${Number(v).toFixed(2)}`]}
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                fontSize: "12px",
                backgroundColor: "#fff",
                boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
              }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
            <Area
              type="monotone"
              dataKey="income"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#gInc)"
              name="Income"
            />
            <Area
              type="monotone"
              dataKey="expense"
              stroke="#EF4444"
              strokeWidth={2}
              fill="url(#gExp)"
              name="Expenses"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonthlyTrendChart;
