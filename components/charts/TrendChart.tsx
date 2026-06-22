"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface TrendProps {
  data: { date: string; applied: number; interview: number }[];
}

export function TrendChart({ data }: TrendProps) {
  const hasData = data.some((d) => d.applied > 0 || d.interview > 0);

  const formatted = data.map((d) => ({
    ...d,
    label: d.date.slice(5),
  }));

  return (
    <div className="relative">
      {!hasData && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <span className="text-xs text-gray-400 bg-white/80 px-3 py-1 rounded-full">近 30 天暂无活动数据</span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={formatted} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
        <defs>
          <linearGradient id="gradApplied" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b4cff" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#5b4cff" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradInterview" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(255,255,255,0.95)",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            fontSize: 13,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
          labelFormatter={(v) => `日期: ${v}`}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 13, paddingTop: 10 }}
        />
        <Area
          type="monotone"
          dataKey="applied"
          name="投递"
          stroke="#5b4cff"
          strokeWidth={2}
          fill="url(#gradApplied)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <Area
          type="monotone"
          dataKey="interview"
          name="面试"
          stroke="#22c55e"
          strokeWidth={2}
          fill="url(#gradInterview)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
    </div>
  );
}
