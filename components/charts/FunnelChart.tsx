"use client";

interface FunnelProps {
  data: { stage: string; count: number; rate: number }[];
}

const COLORS = ["#5b4cff", "#6b5eff", "#7c6fff", "#8d80ff", "#9e91ff", "#22c55e"];

export function FunnelChart({ data }: FunnelProps) {
  if (!data.length) return null;

  const maxCount = Math.max(data[0].count, 1);

  return (
    <div className="space-y-2.5">
      {data.map((item, i) => {
        const widthPct = maxCount > 0 ? Math.max((item.count / maxCount) * 100, 14) : 14;
        const color = i === data.length - 1 ? COLORS[5] : COLORS[Math.min(i, 4)];
        return (
          <div key={item.stage} className="flex items-center gap-2.5">
            <span className="text-xs text-gray-600 w-14 text-right flex-none font-medium">
              {item.stage}
            </span>
            <div className="flex-1 h-8 bg-gray-100/80 rounded-lg overflow-hidden relative">
              <div
                className="h-full rounded-lg flex items-center px-3 transition-all duration-500"
                style={{ width: `${widthPct}%`, backgroundColor: color }}
              >
                <span className="text-xs font-bold text-white whitespace-nowrap tabular-nums">
                  {item.count}
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-gray-500 w-12 flex-none text-right tabular-nums">
              {item.rate}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
