import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";

interface ForecastDay { date: string; projectedBalance: number; eventDescription?: string; }
interface Props { data: ForecastDay[]; }

const CashFlowChart: React.FC<Props> = ({ data }) => {
  const safe = Array.isArray(data) ? data : [];

  if (safe.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-44 text-slate-400 gap-2">
        <span className="text-3xl">📈</span>
        <p className="text-sm font-medium">No cash flow data</p>
        <p className="text-xs">Add recurring transactions to see your 30-day forecast</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">30-Day Cash Flow Forecast</p>
      <div style={{ width: "100%", height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={safe} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gCash" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `€${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
            />
            <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="4 2" strokeWidth={1} />
            <Tooltip
              formatter={(v: any) => [`€${Number(v).toFixed(2)}`, "Projected Balance"]}
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                fontSize: "12px",
                backgroundColor: "#fff",
              }}
            />
            <Area
              type="monotone"
              dataKey="projectedBalance"
              stroke="#6366F1"
              strokeWidth={2}
              fill="url(#gCash)"
              name="Projected Balance"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CashFlowChart;
