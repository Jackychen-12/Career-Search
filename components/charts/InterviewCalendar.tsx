"use client";

interface CalendarProps {
  heatmap: Record<string, number>;
}

function getWeekRange(endDate: Date): { start: string; end: string } {
  const s = new Date(endDate);
  s.setDate(s.getDate() - s.getDay());
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return { start: fmt(s), end: fmt(e) };
}

export function InterviewCalendar({ heatmap }: CalendarProps) {
  const today = new Date();
  const weeks: { label: string; count: number }[] = [];

  for (let w = 11; w >= 0; w--) {
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() - w * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);

    let count = 0;
    const cursor = new Date(weekStart);
    while (cursor <= weekEnd) {
      const key = cursor.toISOString().slice(0, 10);
      count += heatmap[key] || 0;
      cursor.setDate(cursor.getDate() + 1);
    }

    const range = getWeekRange(weekEnd);
    weeks.push({ label: `${range.start}`, count });
  }

  const totalActivity = Object.values(heatmap).reduce((s, v) => s + v, 0);
  const maxCount = Math.max(...weeks.map((w) => w.count), 1);

  return (
    <div>
      <div className="flex items-end gap-1 h-24">
        {weeks.map((week, i) => {
          const pct = (week.count / maxCount) * 100;
          const isRecent = i >= 10;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-0.5">
              {week.count > 0 && (
                <span className="text-[10px] font-bold text-brand-500 tabular-nums font-mono">
                  {week.count}
                </span>
              )}
              <div
                className={`w-full rounded-t transition-all min-w-[8px] ${isRecent ? "bg-brand-500" : "bg-brand-400"}`}
                style={{ height: week.count > 0 ? `${Math.max(pct, 10)}%` : "2px", opacity: week.count > 0 ? (isRecent ? 1 : 0.75) : 0.15 }}
                title={`${week.label}: ${week.count} 次活动`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {weeks.map((week, i) => (
          <div key={i} className="flex-1 text-center">
            {i % 2 === 0 && <span className="text-[9px] text-[var(--text-t)] leading-none">{week.label}</span>}
          </div>
        ))}
      </div>
      <div className="text-right mt-1.5">
        <span className="text-[11px] text-[var(--text-s)]">
          近 12 周共 <strong className="text-[var(--text)] font-mono">{totalActivity}</strong> 次活动
        </span>
      </div>
    </div>
  );
}
