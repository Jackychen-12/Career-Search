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
            <span className="text-[11px] text-[var(--text-s)] w-[50px] text-right flex-none font-semibold">
              {item.stage}
            </span>
            <div className="flex-1 h-5 bg-[rgba(0,0,0,0.03)] rounded-[3px] overflow-hidden relative">
              <div
                className="h-full rounded-[3px] flex items-center px-2.5 transition-all duration-500"
                style={{ width: `${widthPct}%`, backgroundColor: color }}
              >
                <span className="text-[10px] font-bold text-white whitespace-nowrap tabular-nums font-mono">
                  {item.count}
                </span>
              </div>
            </div>
            <span className="text-[9px] text-[var(--text-t)] w-8 flex-none text-right tabular-nums font-mono">
              {item.rate}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
