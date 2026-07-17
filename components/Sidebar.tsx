"use client";

import { useMemo } from "react";
import { daysUntil } from "@/lib/scoring";
import { hasPrefs } from "@/lib/ranking";
import { computeProfileMatchDetailed } from "@/lib/matchScore";
import type { Job, Prefs } from "@/lib/types";
import type { TrackingData } from "@/lib/tracker";

export default function Sidebar({
  jobs,
  now,
  newJobIds,
  prefs,
  tracking,
  onOpenWeekly,
}: {
  jobs: Job[];
  now: number;
  newJobIds: string[];
  prefs: Prefs;
  tracking: TrackingData;
  onOpenWeekly?: () => void;
}) {
  const profileReady = hasPrefs(prefs);
  const d = new Date(now);
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const weeklyTop = useMemo(() => {
    if (!profileReady) return [];
    return jobs
      .filter((j) => j.region !== "海外" && j.category !== "外企")
      .map((j) => ({ job: j, score: computeProfileMatchDetailed(j, prefs).score }))
      .filter((m) => m.score > 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [jobs, prefs, profileReady]);

  const urgentJobs = jobs
    .filter((j) => {
      const x = daysUntil(j.deadline, d);
      return x !== null && x >= 0 && x <= 10;
    })
    .sort((a, b) => {
      const da = daysUntil(a.deadline, d) ?? 99;
      const db = daysUntil(b.deadline, d) ?? 99;
      return da - db;
    })
    .slice(0, 8);

  const discover = useMemo(() => {
    const sorted = jobs
      .filter((j) => j.scores.aiMatch > 0.2)
      .sort((a, b) => b.scores.aiMatch - a.scores.aiMatch);
    const result: Job[] = [];
    const seenCompanies = new Set<string>();
    const seenCategories = new Set<string>();
    for (const j of sorted) {
      if (seenCompanies.has(j.company)) continue;
      const categoryBonus = seenCategories.has(j.category) ? 0 : 1;
      if (result.length < 6) {
        if (categoryBonus || result.length < 3) {
          result.push(j);
          seenCompanies.add(j.company);
          seenCategories.add(j.category);
        }
      }
      if (result.length >= 6) break;
    }
    return result;
  }, [jobs]);

  // --- Stats (moved from StatBar) ---
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

  const statItems = [
    {
      label: "本周高匹配",
      value: weeklyMatchCount !== null ? String(weeklyMatchCount) : null,
      fallback: "设置画像后显示",
      color: weeklyMatchCount && weeklyMatchCount > 0 ? "text-green-600" : "text-gray-900",
      iconBg: "bg-green-50",
      iconColor: "text-green-500",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="space-y-4">
      {/* 临近截止 */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-red-500 rounded-full" />
          临近截止
        </h3>
        {urgentJobs.length === 0 ? (
          <p className="text-sm text-gray-400">暂无紧急岗位</p>
        ) : (
          <ol className="space-y-2">
            {urgentJobs.map((job) => {
              const dl = daysUntil(job.deadline, d);
              return (
                <li key={job.id} className="flex gap-2 text-sm">
                  <span className="shrink-0 w-6 text-center text-[11px] font-medium leading-5 rounded bg-red-50 text-red-600">
                    {dl}天
                  </span>
                  <div className="min-w-0 flex-1">
                    <a href={job.applyUrl} target="_blank" rel="noreferrer" className="text-gray-700 hover:text-gray-900 line-clamp-1 block text-[13px]">
                      {job.company} · {job.title}
                    </a>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      截止 {job.deadline?.slice(5, 10)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* 发现更多 */}
      {discover.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-brand-400 rounded-full" />
            发现更多
          </h3>
          <ol className="space-y-2">
            {discover.map((job, idx) => (
              <li key={job.id} className="flex gap-2 text-sm">
                <span className={`shrink-0 w-5 text-center text-[11px] font-medium leading-5 rounded ${idx < 3 ? "bg-brand-100 text-brand-600" : "bg-gray-100 text-gray-500"}`}>
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <a href={`/job/${job.id}`} className="text-gray-700 hover:text-gray-900 line-clamp-1 block text-[13px]">
                    {job.company} · {job.title}
                  </a>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {job.category} · 匹配 {Math.round(job.scores.aiMatch * 100)}%
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* 投递清单入口 + 预览 */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <span className="w-1 h-4 bg-violet-500 rounded-full" />
          本周建议投递
        </h3>
        {weeklyTop.length > 0 ? (
          <ol className="space-y-2 mb-3">
            {weeklyTop.map((m, i) => (
              <li key={m.job.id} className="flex gap-2 text-sm">
                <span className={`shrink-0 w-5 text-center text-[11px] font-medium leading-5 rounded ${i === 0 ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-500"}`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <a href={`/job/${m.job.id}`} className="text-gray-700 hover:text-gray-900 line-clamp-1 block text-[13px]">
                    {m.job.company} · {m.job.title}
                  </a>
                  <div className="text-[11px] text-gray-400 mt-0.5">匹配 {Math.round(m.score * 100)}%</div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-gray-400 mb-3">设置画像后显示推荐</p>
        )}
        <button onClick={onOpenWeekly} className="w-full py-2 rounded-lg text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition">
          查看完整清单 →
        </button>
      </div>

      {/* 个人数据概览 */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-teal-500 rounded-full" />
          数据概览
        </h3>
        <div className="space-y-2.5">
          {statItems.map((s) => (
            <div key={s.label} className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg ${s.iconBg} flex items-center justify-center ${s.iconColor} shrink-0`}>
                {s.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-gray-500">{s.label}</div>
                {s.value !== null ? (
                  <div className={`text-[15px] font-bold leading-tight ${s.color}`}>{s.value}</div>
                ) : (
                  <div className="text-[11px] text-gray-400">{s.fallback}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 数据统计 */}
      <div className="card p-4 text-xs text-gray-500 leading-relaxed">
        <p className="font-medium text-gray-700 mb-1">关于数据</p>
        <p>
          岗位来自公开招聘 API + 社区维护的校招仓库，每日自动抓取更新。投递以官方页面为准。
        </p>
      </div>
    </aside>
  );
}
