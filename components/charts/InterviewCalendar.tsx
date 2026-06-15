"use client";

interface CalendarProps {
  heatmap: Record<string, number>;
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function getColor(count: number): string {
  if (count === 0) return "bg-slate-100 dark:bg-slate-800";
  if (count === 1) return "bg-brand-100 dark:bg-brand-500/20";
  if (count === 2) return "bg-brand-300 dark:bg-brand-500/40";
  return "bg-brand-500 dark:bg-brand-500/70";
}

export function InterviewCalendar({ heatmap }: CalendarProps) {
  const today = new Date();
  const weeks: { date: string; count: number; day: number; month: number }[][] = [];

  const start = new Date(today);
  start.setDate(start.getDate() - 83);
  start.setDate(start.getDate() - start.getDay());

  let currentWeek: typeof weeks[0] = [];
  const cursor = new Date(start);

  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10);
    currentWeek.push({
      date: key,
      count: heatmap[key] || 0,
      day: cursor.getDay(),
      month: cursor.getMonth() + 1,
    });
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const totalInterviews = Object.values(heatmap).reduce((s, v) => s + v, 0);

  if (totalInterviews === 0) {
    return (
      <div className="flex items-center justify-center h-36 text-sm text-slate-400">
        暂无面试记录
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-[3px]">
        <div className="flex flex-col gap-[3px] mr-1">
          {WEEKDAYS.filter((_, i) => i % 2 === 1).map((d) => (
            <div key={d} className="w-3 h-3 flex items-center justify-center text-[8px] text-slate-400 leading-none">
              {d}
            </div>
          ))}
        </div>
        <div className="flex gap-[3px] overflow-x-auto">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((cell) => (
                <div
                  key={cell.date}
                  className={`w-3 h-3 rounded-[2px] ${getColor(cell.count)} transition-colors`}
                  title={`${cell.date}: ${cell.count} 场面试`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[10px] text-slate-400">少</span>
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className={`w-3 h-3 rounded-[2px] ${getColor(n)}`} />
        ))}
        <span className="text-[10px] text-slate-400">多</span>
        <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">
          共 <strong className="text-slate-700 dark:text-slate-200">{totalInterviews}</strong> 场面试
        </span>
      </div>
    </div>
  );
}
