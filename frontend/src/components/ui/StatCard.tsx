import React from "react";
import clsx from "clsx";

interface Props {
  label: string;
  value: string | number;
  trend?: string;
  variant?: "positive" | "negative" | "neutral";
}

const badge = {
  positive: "bg-green-100 text-green-700",
  negative: "bg-red-100 text-red-700",
  neutral:  "bg-gray-100 text-gray-600",
};

const StatCard: React.FC<Props> = ({ label, value, trend, variant = "neutral" }) => (
  <div className="card p-5">
    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{label}</p>
    <p className="text-2xl font-bold text-gray-900">
      {typeof value === "number" ? `€${value.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value}
    </p>
    {trend && (
      <span className={clsx("mt-2 inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full", badge[variant])}>
        {trend}
      </span>
    )}
  </div>
);

export default StatCard;
