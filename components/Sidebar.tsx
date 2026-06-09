"use client";

import { daysUntil } from "@/lib/scoring";
import type { Job } from "@/lib/types";

export default function Sidebar({ jobs, now, onOpenWeekly }: { jobs: Job[]; now: number; onOpenWeekly?: () => void }) {
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

      {/* 投递清单入口 */}
      <div className="card p-4 cursor-pointer hover:border-brand-300 transition" onClick={onOpenWeekly}>
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <span className="w-1 h-4 bg-brand-500 rounded-sm" />
          本周投递清单
        </h3>
        <p className="text-xs text-gray-500">基于你的画像，AI 推荐本周最该投递的岗位</p>
        <div className="mt-2 text-xs text-brand-600 font-medium">查看清单 →</div>
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
