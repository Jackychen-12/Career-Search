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
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="px-3 h-8 rounded-md text-sm text-gray-600 hover:bg-brand-50 hover:text-brand-600 transition">←</button>
          <h3 className="text-base font-semibold">{year} 年 {month + 1} 月</h3>
          <button onClick={nextMonth} className="px-3 h-8 rounded-md text-sm text-gray-600 hover:bg-brand-50 hover:text-brand-600 transition">→</button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
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
                className={`relative rounded-lg py-2 text-sm transition ${
                  isSelected ? "bg-brand-500 text-white" :
                  isToday ? "bg-brand-50 text-brand-600 font-bold" :
                  count > 0 ? "hover:bg-gray-50 font-medium" : "text-gray-400"
                }`}
              >
                {day}
                {count > 0 && !isSelected && (
                  <span className="absolute -top-0.5 -right-0.5 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center bg-red-500 text-white">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card p-4 h-fit lg:sticky lg:top-20">
        {selected ? (
          <>
            <h4 className="text-sm font-semibold mb-3">
              {selected} 截止（{selectedJobs.length} 个岗位）
            </h4>
            {selectedJobs.length === 0 ? (
              <p className="text-sm text-gray-400">当天无截止岗位</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {selectedJobs.map((j) => (
                  <a
                    key={j.id}
                    href={j.applyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block p-3 rounded-lg border border-gray-100 hover:border-brand-500 hover:shadow-sm transition"
                  >
                    <div className="font-medium text-sm">{j.company}</div>
                    <div className="text-xs text-brand-600 mt-0.5">{j.title}</div>
                    <div className="text-xs text-gray-400 mt-1">{j.location.join(" / ")} · {j.jobType}</div>
                  </a>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="py-8 text-center text-sm text-gray-400">
            点击日期查看当天截止的岗位
          </div>
        )}
      </div>
    </div>
  );
}
