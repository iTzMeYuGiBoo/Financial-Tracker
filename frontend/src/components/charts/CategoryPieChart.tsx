import React from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface Category { name: string; color: string; icon: string; amount: number; percentage: number; }
interface Props { data: Category[]; }

const CategoryPieChart: React.FC<Props> = ({ data }) => {
  const safe = Array.isArray(data) ? data.filter((d) => d.amount > 0) : [];

  if (safe.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-56 text-slate-400 gap-2">
        <span className="text-3xl">🥧</span>
        <p className="text-sm font-medium">No category data for this period</p>
        <p className="text-xs text-center">Add expense transactions to see the breakdown</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Spending by Category</p>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={safe}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="amount"
              nameKey="name"
            >
              {safe.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: any, name: any) => [`€${Number(v).toFixed(2)}`, name]}
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                fontSize: "12px",
                backgroundColor: "#fff",
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => {
                const item = safe.find((d) => d.name === value);
                return (
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    {item?.icon} {value}
                  </span>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CategoryPieChart;
