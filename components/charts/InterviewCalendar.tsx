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

  if (totalActivity === 0) {
    return (
      <div className="flex items-center justify-center h-36 text-sm text-slate-400">
        暂无求职活动记录
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-end gap-1.5 h-28">
        {weeks.map((week, i) => {
          const pct = (week.count / maxCount) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
              {week.count > 0 && (
                <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
                  {week.count}
                </span>
              )}
              <div
                className="w-full rounded-t-md bg-brand-400 dark:bg-brand-500 transition-all min-w-[12px]"
                style={{ height: week.count > 0 ? `${Math.max(pct, 8)}%` : "2px", opacity: week.count > 0 ? 1 : 0.2 }}
                title={`${week.label}: ${week.count} 次活动`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-1">
        {weeks.map((week, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-[10px] text-slate-400 leading-none">{week.label}</span>
          </div>
        ))}
      </div>
      <div className="text-right mt-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          近 12 周共 <strong className="text-slate-700 dark:text-slate-200">{totalActivity}</strong> 次活动
        </span>
      </div>
    </div>
  );
}
