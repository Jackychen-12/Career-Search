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
    <div className="space-y-2.5">
      {data.map((item, i) => {
        const widthPct = maxCount > 0 ? Math.max((item.count / maxCount) * 100, 12) : 12;
        return (
          <div key={item.stage} className="flex items-center gap-3">
            <span className="text-sm text-slate-600 w-16 text-right flex-none font-medium">
              {item.stage}
            </span>
            <div className="flex-1 relative h-9">
              <div
                className="h-full rounded-md flex items-center px-3 transition-all duration-500"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: i === data.length - 1 ? COLORS[5] : COLORS[Math.min(i, 4)],
                }}
              >
                <span className="text-xs font-bold text-white whitespace-nowrap">
                  {item.count}
                </span>
              </div>
            </div>
            <span className="text-xs font-medium text-slate-500 w-12 flex-none text-right tabular-nums">
              {item.rate}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
