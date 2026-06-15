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
    <div className="space-y-2">
      {data.map((item, i) => {
        const widthPct = maxCount > 0 ? Math.max((item.count / maxCount) * 100, 8) : 8;
        return (
          <div key={item.stage} className="flex items-center gap-3">
            <span className="text-[12px] text-slate-500 dark:text-slate-400 w-14 text-right flex-none">
              {item.stage}
            </span>
            <div className="flex-1 relative h-8">
              <div
                className="h-full rounded-md flex items-center px-3 transition-all duration-500"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: i === data.length - 1 ? COLORS[5] : COLORS[Math.min(i, 4)],
                }}
              >
                <span className="text-[11px] font-semibold text-white whitespace-nowrap">
                  {item.count}
                </span>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 w-10 flex-none">
              {item.rate}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
