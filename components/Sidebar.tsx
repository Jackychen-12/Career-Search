"use client";

import { useEffect, useMemo, useState } from "react";
import { daysUntil } from "@/lib/scoring";
import { loadPrefs } from "@/lib/prefs";
import { hasPrefs } from "@/lib/ranking";
import { computeProfileMatchDetailed } from "@/lib/matchScore";
import type { Job, Prefs } from "@/lib/types";

export default function Sidebar({ jobs, now, onOpenWeekly }: { jobs: Job[]; now: number; onOpenWeekly?: () => void }) {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  useEffect(() => { const p = loadPrefs(); if (hasPrefs(p)) setPrefs(p); }, []);

  const weeklyTop = useMemo(() => {
    if (!prefs) return [];
    return jobs
      .filter((j) => j.region !== "海外" && j.category !== "外企")
      .map((j) => ({ job: j, score: computeProfileMatchDetailed(j, prefs).score }))
      .filter((m) => m.score > 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [jobs, prefs]);

  const d = new Date(now);

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

  const topMatch = jobs
    .filter((j) => j.scores.aiMatch > 0.4)
    .sort((a, b) => b.scores.aiMatch - a.scores.aiMatch)
    .slice(0, 6);

  return (
    <aside className="space-y-4">
      {/* 临近截止 */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-red-500 rounded-sm" />
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
                    <a href={job.applyUrl} target="_blank" rel="noreferrer" className="text-gray-700 hover:text-brand-600 line-clamp-1 block text-[13px]">
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

      {/* AI 推荐 */}
      {topMatch.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-brand-500 rounded-sm" />
            AI 推荐
          </h3>
          <ol className="space-y-2">
            {topMatch.map((job, idx) => (
              <li key={job.id} className="flex gap-2 text-sm">
                <span className={`shrink-0 w-5 text-center text-[11px] font-medium leading-5 rounded ${idx < 3 ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <a href={job.applyUrl} target="_blank" rel="noreferrer" className="text-gray-700 hover:text-brand-600 line-clamp-1 block text-[13px]">
                    {job.company} · {job.title}
                  </a>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    匹配 {Math.round(job.scores.aiMatch * 100)}%
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
          <span className="w-1 h-4 bg-brand-500 rounded-sm" />
          本周建议投递
        </h3>
        {weeklyTop.length > 0 ? (
          <ol className="space-y-2 mb-3">
            {weeklyTop.map((m, i) => (
              <li key={m.job.id} className="flex gap-2 text-sm">
                <span className={`shrink-0 w-5 text-center text-[11px] font-medium leading-5 rounded ${i === 0 ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-500"}`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <a href={`/job/${m.job.id}`} className="text-gray-700 hover:text-brand-600 line-clamp-1 block text-[13px]">
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
        <button onClick={onOpenWeekly} className="w-full py-2 rounded-lg text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 transition">
          查看完整清单 →
        </button>
      </div>

      {/* 面试记录入口 */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <span className="w-1 h-4 bg-indigo-500 rounded-sm" />
          面试记录
        </h3>
        <p className="text-xs text-gray-400 mb-3">记录每次面试详情，支持 AI 智能填入</p>
        <a href="/interviews/" className="block w-full py-2 rounded-lg text-xs font-medium text-center text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition">
          管理面试记录 →
        </a>
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
