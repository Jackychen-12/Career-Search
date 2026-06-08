"use client";

import { useState } from "react";
import type { Job } from "@/lib/types";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toKey(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export default function CalendarView({ jobs, now }: { jobs: Job[]; now: number }) {
  const today = new Date(now);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  const deadlineMap = new Map<string, Job[]>();
  for (const j of jobs) {
    if (!j.deadline) continue;
    const key = j.deadline.slice(0, 10);
    const arr = deadlineMap.get(key) ?? [];
    arr.push(j);
    deadlineMap.set(key, arr);
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function prevMonth() {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
    setSelected(null);
  }
  function nextMonth() {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
    setSelected(null);
  }

  const selectedJobs = selected ? (deadlineMap.get(selected) ?? []) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="w-8 h-8 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition grid place-items-center text-sm">←</button>
          <h3 className="text-sm font-semibold text-slate-900">{year} 年 {month + 1} 月</h3>
          <button onClick={nextMonth} className="w-8 h-8 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition grid place-items-center text-sm">→</button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-400 mb-1.5 font-medium">
          {WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={`e${i}`} />;
            const key = toKey(year, month, day);
            const count = deadlineMap.get(key)?.length ?? 0;
            const isToday = key === todayKey;
            const isSelected = key === selected;
            return (
              <button
                key={key}
                onClick={() => setSelected(isSelected ? null : key)}
                className={`relative rounded-md py-2 text-xs transition ${
                  isSelected ? "bg-nav text-white" :
                  isToday ? "bg-cyan-50 text-cyan-700 font-bold ring-1 ring-cyan-200" :
                  count > 0 ? "hover:bg-slate-50 text-slate-900 font-medium" : "text-slate-300"
                }`}
              >
                {day}
                {count > 0 && !isSelected && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 text-[8px] font-bold rounded-full flex items-center justify-center bg-red-500 text-white">
                    {count > 9 ? "+" : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Side panel */}
      <div className="card p-4 h-fit lg:sticky lg:top-16">
        {selected ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-mono font-medium text-slate-900">{selected}</span>
              <span className="text-[11px] text-slate-400">{selectedJobs.length} 个截止</span>
            </div>
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {selectedJobs.map((j) => (
                <a
                  key={j.id}
                  href={j.applyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-2.5 rounded-md border border-slate-100 hover:border-cyan-300 hover:bg-cyan-50/30 transition"
                >
                  <div className="text-xs font-medium text-slate-900">{j.company}</div>
                  <div className="text-[11px] text-cyan-700 mt-0.5 truncate">{j.title}</div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">{j.location[0]} · {j.jobType}</div>
                </a>
              ))}
            </div>
          </>
        ) : (
          <div className="py-10 text-center text-xs text-slate-400">
            选择日期查看截止岗位
          </div>
        )}
      </div>
    </div>
  );
}
