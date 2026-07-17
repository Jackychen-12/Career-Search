"use client";

import { useMemo } from "react";
import { daysUntil } from "@/lib/scoring";
import { hasPrefs } from "@/lib/ranking";
import { computeProfileMatchDetailed } from "@/lib/matchScore";
import type { Job, Prefs } from "@/lib/types";
import type { TrackingData } from "@/lib/tracker";

export default function StatBar({
  jobs,
  now,
  newJobIds,
  prefs,
  tracking,
}: {
  jobs: Job[];
  now: number;
  newJobIds: string[];
  prefs: Prefs;
  tracking: TrackingData;
}) {
  const d = new Date(now);
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const profileReady = hasPrefs(prefs);

  const weeklyMatchCount = useMemo(() => {
    if (!profileReady) return null;
    return jobs.filter((j) => {
      const seen = new Date(j.firstSeen).getTime();
      if (seen < weekAgo) return false;
      return computeProfileMatchDetailed(j, prefs).score >= 0.6;
    }).length;
  }, [jobs, prefs, weekAgo, profileReady]);

  const trackedCompanyNewCount = useMemo(() => {
    const trackedIds = Object.keys(tracking);
    if (trackedIds.length === 0) return null;
    const companies = new Set(
      trackedIds.map((id) => jobs.find((j) => j.id === id)?.company).filter(Boolean),
    );
    if (companies.size === 0) return null;
    const newSet = new Set(newJobIds);
    return jobs.filter((j) => newSet.has(j.id) && companies.has(j.company)).length;
  }, [jobs, tracking, newJobIds]);

  const nearestDeadline = useMemo(() => {
    const trackedIds = new Set(Object.keys(tracking));
    const scope = trackedIds.size > 0 ? jobs.filter((j) => trackedIds.has(j.id)) : jobs;
    let min: number | null = null;
    for (const j of scope) {
      const days = daysUntil(j.deadline, d);
      if (days !== null && days >= 0 && (min === null || days < min)) min = days;
    }
    return min;
  }, [jobs, tracking, d]);

  const cards = [
    {
      label: "本周高匹配",
      value: weeklyMatchCount !== null ? String(weeklyMatchCount) : null,
      fallback: "设置画像后显示",
      color: weeklyMatchCount && weeklyMatchCount > 0 ? "text-green-600" : "text-gray-900",
      borderColor: "border-l-green-500",
      iconBg: "bg-green-50",
      iconColor: "text-green-500",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      label: "关注公司新岗",
      value: trackedCompanyNewCount !== null ? String(trackedCompanyNewCount) : null,
      fallback: "收藏岗位后显示",
      color: trackedCompanyNewCount && trackedCompanyNewCount > 0 ? "text-amber-600" : "text-gray-900",
      borderColor: "border-l-amber-500",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      label: "最近截止",
      value: nearestDeadline !== null ? `${nearestDeadline} 天` : null,
      fallback: "暂无截止",
      color:
        nearestDeadline !== null && nearestDeadline <= 3
          ? "text-red-600"
          : nearestDeadline !== null && nearestDeadline <= 7
            ? "text-orange-500"
            : "text-gray-900",
      borderColor:
        nearestDeadline !== null && nearestDeadline <= 3
          ? "border-l-red-500"
          : nearestDeadline !== null && nearestDeadline <= 7
            ? "border-l-orange-500"
            : "border-l-gray-300",
      iconBg:
        nearestDeadline !== null && nearestDeadline <= 3
          ? "bg-red-50"
          : nearestDeadline !== null && nearestDeadline <= 7
            ? "bg-orange-50"
            : "bg-gray-50",
      iconColor:
        nearestDeadline !== null && nearestDeadline <= 3
          ? "text-red-500"
          : nearestDeadline !== null && nearestDeadline <= 7
            ? "text-orange-500"
            : "text-gray-400",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((c) => (
        <div key={c.label} className={`stat-card px-4 py-3 flex items-center gap-3 border-l-[3px] ${c.borderColor}`}>
          <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center ${c.iconColor}`}>
            {c.icon}
          </div>
          <div>
            {c.value !== null ? (
              <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
            ) : (
              <div className="text-[13px] text-gray-400">{c.fallback}</div>
            )}
            <div className="text-[11px] text-gray-500">{c.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
