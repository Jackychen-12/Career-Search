"use client";

interface FunnelProps {
  data: { stage: string; count: number; rate: number }[];
}

const COLORS = ["#5b4cff", "#6b5eff", "#7c6fff", "#8d80ff", "#9e91ff", "#22c55e"];

export function FunnelChart({ data }: FunnelProps) {
  if (!data.length || data[0].count === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-slate-400">
        暂无投递数据
      </div>
    );
  }

  const maxCount = data[0].count;

  return (
    <div className="space-y-3">
      {data.map((item, i) => {
        const widthPct = maxCount > 0 ? Math.max((item.count / maxCount) * 100, 12) : 12;
        const color = i === data.length - 1 ? COLORS[5] : COLORS[Math.min(i, 4)];
        return (
          <div key={item.stage} className="flex items-center gap-3">
            <span className="text-sm text-slate-600 w-16 text-right flex-none font-medium">
              {item.stage}
            </span>
            <div className="flex-1 h-10 bg-gray-100/80 rounded-lg overflow-hidden relative">
              <div
                className="h-full rounded-lg flex items-center px-3.5 transition-all duration-500"
                style={{ width: `${widthPct}%`, backgroundColor: color }}
              >
                <span className="text-sm font-bold text-white whitespace-nowrap tabular-nums">
                  {item.count}
                </span>
              </div>
            </div>
            <span className="text-sm font-medium text-slate-500 w-14 flex-none text-right tabular-nums">
              {item.rate}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
