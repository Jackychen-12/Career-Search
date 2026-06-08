"use client";

import { useEffect, useMemo, useState } from "react";
import { loadPrefs } from "@/lib/prefs";
import { hasPrefs } from "@/lib/ranking";
import { computeProfileMatchDetailed } from "@/lib/matchScore";
import { daysUntil } from "@/lib/scoring";
import type { Job, Prefs } from "@/lib/types";

export default function ReportClient({ jobs }: { jobs: Job[] }) {
  const [prefs, setPrefs] = useState<Prefs | null>(null);

  useEffect(() => {
    const p = loadPrefs();
    if (hasPrefs(p)) setPrefs(p);
  }, []);

  const analysis = useMemo(() => {
    if (!prefs) return null;

    const matches = jobs.map((j) => ({
      job: j,
      ...computeProfileMatchDetailed(j, prefs),
    })).sort((a, b) => b.score - a.score);

    const high = matches.filter((m) => m.score > 0.6);
    const mid = matches.filter((m) => m.score > 0.3 && m.score <= 0.6);
    const low = matches.filter((m) => m.score > 0 && m.score <= 0.3);
    const none = matches.filter((m) => m.score === 0);

    // Top skills in demand
    const skillCount: Record<string, number> = {};
    for (const j of jobs) {
      for (const s of j.aiTags?.skills ?? []) {
        skillCount[s] = (skillCount[s] ?? 0) + 1;
      }
    }
    const topMarketSkills = Object.entries(skillCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([skill, count]) => ({ skill, count }));

    const userSkills = new Set([...(prefs.skills ?? []), ...(prefs.resumeKeywords ?? [])].map((s) => s.toLowerCase()));
    const skillGaps = topMarketSkills.filter((s) => !userSkills.has(s.skill.toLowerCase()));
    const skillMatches = topMarketSkills.filter((s) => userSkills.has(s.skill.toLowerCase()));

    // Industry distribution for high matches
    const industryDist: Record<string, number> = {};
    for (const m of high) {
      const ind = m.job.aiTags?.industry ?? m.job.category;
      industryDist[ind] = (industryDist[ind] ?? 0) + 1;
    }

    // Urgent deadlines in top matches
    const now = new Date();
    const urgentTop = matches
      .filter((m) => m.score > 0.3 && m.job.deadline)
      .map((m) => ({ ...m, daysLeft: daysUntil(m.job.deadline, now) }))
      .filter((m) => m.daysLeft !== null && m.daysLeft >= 0 && m.daysLeft <= 30)
      .sort((a, b) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99))
      .slice(0, 8);

    return { matches, high, mid, low, none, topMarketSkills, skillGaps, skillMatches, industryDist, urgentTop };
  }, [jobs, prefs]);

  if (!prefs) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/60 border-b border-black/5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center">
            <a href={(process.env.NEXT_PUBLIC_BASE_PATH ?? "") + "/"} className="text-[15px] font-bold text-gray-900">← Career Search</a>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl mb-4">📊</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">尚未设置求职画像</h2>
            <p className="text-sm text-gray-500 mb-4">请先在首页点击「设置画像」或上传简历，才能生成求职报告。</p>
            <a href={(process.env.NEXT_PUBLIC_BASE_PATH ?? "") + "/"} className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition">
              返回首页设置
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) return null;
  const { high, mid, low, none, matches, topMarketSkills, skillGaps, skillMatches, industryDist, urgentTop } = analysis;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/60 border-b border-black/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href={(process.env.NEXT_PUBLIC_BASE_PATH ?? "") + "/"} className="text-[15px] font-bold text-gray-900 hover:text-brand-600 transition">← Career Search</a>
            <span className="text-gray-300">·</span>
            <span className="text-[14px] font-medium text-gray-700">求职报告</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Profile overview */}
        <section className="card p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-brand-500" />
            画像概览
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {prefs.school && <div><span className="text-gray-400 text-xs">学校</span><div className="font-medium">{prefs.school}</div></div>}
            {prefs.major && <div><span className="text-gray-400 text-xs">专业</span><div className="font-medium">{prefs.major}</div></div>}
            {prefs.degree && <div><span className="text-gray-400 text-xs">学历</span><div className="font-medium">{prefs.degree}</div></div>}
            <div><span className="text-gray-400 text-xs">目标方向</span><div className="font-medium">{(prefs.targetRoles ?? []).join("、") || "未设置"}</div></div>
          </div>
          {(prefs.skills ?? []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {prefs.skills!.map((s) => <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-600">{s}</span>)}
            </div>
          )}
        </section>

        {/* Match distribution */}
        <section className="card p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-brand-500" />
            匹配度分布
          </h2>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: "高匹配 >60%", count: high.length, color: "bg-brand-500 text-white" },
              { label: "中匹配 30-60%", count: mid.length, color: "bg-brand-50 text-brand-600" },
              { label: "低匹配 <30%", count: low.length, color: "bg-gray-100 text-gray-600" },
              { label: "无关联", count: none.length, color: "bg-gray-50 text-gray-400" },
            ].map((b) => (
              <div key={b.label} className="text-center p-3 rounded-lg bg-gray-50">
                <div className={`inline-block text-lg font-bold px-2 py-0.5 rounded-lg ${b.color}`}>{b.count}</div>
                <div className="text-[11px] text-gray-500 mt-1">{b.label}</div>
              </div>
            ))}
          </div>
          {/* Bar chart */}
          <div className="h-4 rounded-full overflow-hidden flex bg-gray-100">
            {high.length > 0 && <div className="bg-brand-500 transition-all" style={{ width: `${(high.length / matches.length) * 100}%` }} />}
            {mid.length > 0 && <div className="bg-brand-200 transition-all" style={{ width: `${(mid.length / matches.length) * 100}%` }} />}
            {low.length > 0 && <div className="bg-gray-300 transition-all" style={{ width: `${(low.length / matches.length) * 100}%` }} />}
          </div>
        </section>

        {/* Top 10 recommendations */}
        <section className="card p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-brand-500" />
            Top 10 推荐岗位
          </h2>
          <div className="space-y-3">
            {matches.slice(0, 10).map((m, i) => (
              <a key={m.job.id} href={m.job.applyUrl} target="_blank" rel="noreferrer" className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
                <span className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${i < 3 ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{m.job.company}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${m.score > 0.6 ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-600"}`}>
                      {Math.round(m.score * 100)}%
                    </span>
                  </div>
                  <div className="text-xs text-brand-600 mt-0.5">{m.job.title}</div>
                  <div className="text-[11px] text-gray-500 mt-1">{m.reasons.join(" · ")}</div>
                </div>
                <span className="shrink-0 text-xs text-gray-400">{m.job.location[0]}</span>
              </a>
            ))}
          </div>
        </section>

        {/* Skill gap analysis */}
        <section className="card p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-brand-500" />
            技能分析
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-semibold text-gray-700 mb-2">你已具备的热门技能</h3>
              {skillMatches.length === 0 ? (
                <p className="text-xs text-gray-400">暂无匹配</p>
              ) : (
                <div className="space-y-1.5">
                  {skillMatches.map((s) => (
                    <div key={s.skill} className="flex items-center gap-2">
                      <div className="flex-1 h-5 bg-brand-50 rounded overflow-hidden">
                        <div className="h-full bg-brand-400 rounded" style={{ width: `${Math.min(100, (s.count / topMarketSkills[0].count) * 100)}%` }} />
                      </div>
                      <span className="text-[11px] text-gray-700 w-20 truncate">{s.skill}</span>
                      <span className="text-[10px] text-gray-400 w-8 text-right">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold text-red-600 mb-2">建议补充的技能</h3>
              {skillGaps.length === 0 ? (
                <p className="text-xs text-gray-400">无明显缺口</p>
              ) : (
                <div className="space-y-1.5">
                  {skillGaps.slice(0, 8).map((s) => (
                    <div key={s.skill} className="flex items-center gap-2">
                      <div className="flex-1 h-5 bg-red-50 rounded overflow-hidden">
                        <div className="h-full bg-red-300 rounded" style={{ width: `${Math.min(100, (s.count / topMarketSkills[0].count) * 100)}%` }} />
                      </div>
                      <span className="text-[11px] text-gray-700 w-20 truncate">{s.skill}</span>
                      <span className="text-[10px] text-gray-400 w-8 text-right">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Industry recommendation */}
        {Object.keys(industryDist).length > 0 && (
          <section className="card p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-brand-500" />
              推荐优先投递行业
            </h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(industryDist).sort((a, b) => b[1] - a[1]).map(([ind, count]) => (
                <div key={ind} className="px-3 py-2 rounded-lg bg-gray-50 text-center">
                  <div className="text-lg font-bold text-brand-600">{count}</div>
                  <div className="text-xs text-gray-600">{ind}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Urgent deadlines */}
        {urgentTop.length > 0 && (
          <section className="card p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-red-500" />
              投递策略 · 紧急优先
            </h2>
            <p className="text-xs text-gray-500 mb-3">以下匹配岗位即将截止，建议尽快投递：</p>
            <div className="space-y-2">
              {urgentTop.map((m) => (
                <a key={m.job.id} href={m.job.applyUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:border-brand-300 transition">
                  <span className="shrink-0 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                    {m.daysLeft}天
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900">{m.job.company} · {m.job.title}</span>
                  </div>
                  <span className="shrink-0 text-[10px] text-gray-400">{m.job.deadline?.slice(0, 10)}</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
