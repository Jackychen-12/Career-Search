"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface StatusPieProps {
  byStatus: Record<string, number>;
}

const STATUS_CONFIG: { key: string; label: string; color: string }[] = [
  { key: "applied", label: "已投递", color: "#5b4cff" },
  { key: "written", label: "笔试", color: "#7c6fff" },
  { key: "interview", label: "面试", color: "#f59e0b" },
  { key: "hr", label: "HR面", color: "#06b6d4" },
  { key: "offer", label: "Offer", color: "#22c55e" },
  { key: "rejected", label: "已拒", color: "#ef4444" },
  { key: "withdrawn", label: "已弃", color: "#94a3b8" },
];

export function StatusPie({ byStatus }: StatusPieProps) {
  const data = STATUS_CONFIG
    .map((s) => ({ name: s.label, value: byStatus[s.key] || 0, color: s.color }))
    .filter((d) => d.value > 0);

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[var(--text-t)]">
        暂无状态数据
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-6">
      <div className="w-44 h-44 flex-none">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [`${value} 个 (${Math.round((value / total) * 100)}%)`, name]}
              contentStyle={{
                backgroundColor: "rgba(255,255,255,0.95)",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 13,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2.5 text-sm">
            <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ backgroundColor: d.color }} />
            <span className="text-[var(--text-s)] flex-1">{d.name}</span>
            <span className="font-semibold text-[var(--text)] tabular-nums">{d.value}</span>
            <span className="text-xs text-[var(--text-t)] tabular-nums w-10 text-right">{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
