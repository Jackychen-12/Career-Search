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
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      {/* Calendar grid */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition text-sm">←</button>
          <h3 className="text-sm font-bold text-gray-900">{year} 年 {month + 1} 月</h3>
          <button onClick={nextMonth} className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition text-sm">→</button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-gray-400 mb-2 font-medium">
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
                onClick={() => count > 0 && setSelected(isSelected ? null : key)}
                className={`relative rounded-md py-2.5 text-xs transition ${
                  isSelected ? "bg-gray-900 text-white" :
                  isToday ? "bg-brand-50 text-brand-700 font-bold" :
                  count > 0 ? "hover:bg-gray-50 text-gray-900 font-medium" : "text-gray-300"
                } ${count > 0 ? "cursor-pointer" : "cursor-default"}`}
              >
                {day}
                {count > 0 && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      <div className="card p-4 h-fit lg:sticky lg:top-20">
        {selected ? (
          <>
            <h4 className="text-xs font-bold text-gray-900 mb-3">
              {selected} <span className="font-normal text-gray-400">· {selectedJobs.length} 个截止</span>
            </h4>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {selectedJobs.map((j) => (
                <a
                  key={j.id}
                  href={j.applyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-2.5 rounded-md border border-gray-100 hover:border-gray-300 transition"
                >
                  <div className="text-xs font-medium text-gray-900">{j.company}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5 truncate">{j.title}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{j.location[0]} · {j.jobType}</div>
                </a>
              ))}
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-xs text-gray-300">
            点击有标记的日期查看截止岗位
          </div>
        )}
      </div>
    </div>
  );
}
