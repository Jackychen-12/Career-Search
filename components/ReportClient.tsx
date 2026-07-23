"use client";

import { useEffect, useMemo, useState } from "react";
import { loadPrefs } from "@/lib/prefs";
import { hasPrefs } from "@/lib/ranking";
import { computeProfileMatchDetailed } from "@/lib/matchScore";
import { daysUntil } from "@/lib/scoring";
import type { Job, Prefs } from "@/lib/types";

const INDUSTRY_COLORS: Record<string, string> = {
  "互联网": "#5b4cff", "金融": "#F59E0B", "外企": "#10B981",
  "快消": "#F97316", "管培": "#8B5CF6", "实体": "#78716c", "其他": "#9CA3AF",
};

export default function ReportClient({ jobs }: { jobs: Job[] }) {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [activeBucket, setActiveBucket] = useState<string | null>(null);

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

    const industryDist: Record<string, number> = {};
    for (const m of high) {
      const ind = m.job.aiTags?.industry ?? m.job.category;
      industryDist[ind] = (industryDist[ind] ?? 0) + 1;
    }

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
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-[var(--surface-solid)]/80 border-b border-[var(--border)] shadow-[var(--shadow-sm)]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center">
            <a href="/" className="text-[15px] font-bold text-[var(--text)]">← Career Search</a>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl mb-4">📊</div>
            <h2 className="text-lg font-black tracking-tight text-[var(--text)] mb-2">尚未设置求职画像</h2>
            <p className="text-sm text-[var(--text-s)] mb-4">请先在首页点击「设置画像」或上传简历，才能生成求职报告。</p>
            <a href="/" className="px-4 py-2 rounded-[var(--radius-xs)] text-sm font-medium bg-brand-500 text-white transition">
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
      <header className="sticky top-0 z-40 bg-[var(--surface)] backdrop-blur-[8px] [backdrop-filter:blur(8px)_saturate(180%)] border-b border-[var(--border)] shadow-[var(--shadow-sm)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-[15px] font-bold text-[var(--text)] hover:text-brand-500 transition">← Career Search</a>
            <span className="text-[var(--text-t)]">·</span>
            <span className="text-[14px] font-medium text-[var(--text)]">求职报告</span>
          </div>
          <div className="flex items-center gap-3 print:hidden">
            <button
              onClick={() => navigator.clipboard.writeText(window.location.href).then(() => alert("链接已复制"))}
              className="text-[13px] text-[var(--text-s)] hover:text-brand-500 transition"
            >
              分享
            </button>
            <button onClick={() => window.print()} className="text-[13px] text-[var(--text-s)] hover:text-brand-500 transition">
              导出 PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* 1. 画像概览 */}
        <section className="card p-6">
          <h2 className="text-base font-black tracking-tight text-[var(--text)] mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-brand-500" />
            画像概览
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {prefs.school && <div><span className="text-[var(--text-t)] text-xs">学校</span><div className="font-medium">{prefs.school}</div></div>}
            {prefs.major && <div><span className="text-[var(--text-t)] text-xs">专业</span><div className="font-medium">{prefs.major}</div></div>}
            {prefs.degree && <div><span className="text-[var(--text-t)] text-xs">学历</span><div className="font-medium">{prefs.degree}</div></div>}
            <div><span className="text-[var(--text-t)] text-xs">目标方向</span><div className="font-medium">{(prefs.targetRoles ?? []).join("、") || "未设置"}</div></div>
          </div>
          {prefs.summary && (
            <div className="mt-3 p-3 rounded-[var(--radius-xs)] bg-brand-50/50 text-xs text-brand-500">{prefs.summary}</div>
          )}
          {(prefs.skills ?? []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {prefs.skills!.map((s) => <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-500">{s}</span>)}
            </div>
          )}
          {((prefs.strengths ?? []).length > 0 || (prefs.weaknesses ?? []).length > 0) && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(prefs.strengths ?? []).length > 0 && (
                <div>
                  <span className="text-[11px] font-medium text-[var(--green)]">优势：</span>
                  <span className="text-[11px] text-[var(--green)]">{prefs.strengths!.join("、")}</span>
                </div>
              )}
              {(prefs.weaknesses ?? []).length > 0 && (
                <div>
                  <span className="text-[11px] font-medium text-[var(--amber)]">待提升：</span>
                  <span className="text-[11px] text-[var(--amber)]">{prefs.weaknesses!.join("、")}</span>
                </div>
              )}
            </div>
          )}
          {(prefs.experiences ?? []).length > 0 && (
            <div className="mt-4 border-t border-[var(--border)] pt-3">
              <div className="text-xs font-medium text-[var(--text)] mb-2">实习/工作经历（{prefs.experiences!.length} 段）</div>
              <div className="space-y-2">
                {prefs.experiences!.map((exp, i) => (
                  <div key={i} className="p-2.5 rounded-[var(--radius-xs)] bg-[var(--surface)] border border-[var(--border)]">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-[var(--text)]">{exp.company}</span>
                      <span className="text-[11px] text-brand-500">{exp.role}</span>
                      {exp.duration && <span className="text-[10px] text-[var(--text-t)]">{exp.duration}</span>}
                    </div>
                    {exp.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {exp.skills.slice(0, 5).map((s) => <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-500">{s}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 2. 匹配度分布 */}
        <section className="card p-6">
          <h2 className="text-base font-black tracking-tight text-[var(--text)] mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-brand-500" />
            匹配度分布
          </h2>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { key: "high", label: "高匹配 >60%", count: high.length, color: "bg-brand-500 text-white", ring: "ring-brand-500" },
              { key: "mid", label: "中匹配 30-60%", count: mid.length, color: "bg-brand-50 text-brand-500", ring: "ring-brand-300" },
              { key: "low", label: "低匹配 <30%", count: low.length, color: "bg-[rgba(0,0,0,0.04)] text-[var(--text-s)]", ring: "ring-[var(--border-s)]" },
              { key: "none", label: "无关联", count: none.length, color: "bg-[var(--surface)] text-[var(--text-t)]", ring: "ring-[var(--border-s)]" },
            ].map((b) => (
              <button
                key={b.key}
                onClick={() => setActiveBucket(activeBucket === b.key ? null : b.key)}
                className={`text-center p-3 rounded-[var(--radius-xs)] bg-[var(--surface)] transition cursor-pointer hover:bg-[rgba(0,0,0,0.04)] ${activeBucket === b.key ? `ring-2 ${b.ring}` : ""}`}
              >
                <div className={`inline-block text-lg font-bold font-mono px-2 py-0.5 rounded-[var(--radius-xs)] ${b.color}`}>{b.count}</div>
                <div className="text-[11px] text-[var(--text-s)] mt-1">{b.label}</div>
              </button>
            ))}
          </div>
          <div className="h-[5px] rounded-full overflow-hidden flex bg-[rgba(0,0,0,0.04)]">
            {high.length > 0 && <div className="bg-brand-500 transition-all" style={{ width: `${(high.length / matches.length) * 100}%` }} />}
            {mid.length > 0 && <div className="bg-brand-200 transition-all" style={{ width: `${(mid.length / matches.length) * 100}%` }} />}
            {low.length > 0 && <div className="bg-[rgba(0,0,0,0.10)] transition-all" style={{ width: `${(low.length / matches.length) * 100}%` }} />}
          </div>
          {activeBucket && (
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <div className="text-xs font-medium text-[var(--text)] mb-3">
                {activeBucket === "high" && `高匹配岗位（${high.length}个）`}
                {activeBucket === "mid" && `中匹配岗位（${mid.length}个）`}
                {activeBucket === "low" && `低匹配岗位（${low.length}个）`}
                {activeBucket === "none" && `无关联岗位（${none.length}个）`}
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {(activeBucket === "high" ? high : activeBucket === "mid" ? mid : activeBucket === "low" ? low : none)
                  .slice(0, 20)
                  .map((m) => (
                    <a key={m.job.id} href={`/job/${m.job.id}`} className="flex items-center gap-3 p-2.5 rounded-[var(--radius-xs)] hover:bg-[var(--surface)] transition">
                      <span className={`shrink-0 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                        m.score > 0.6 ? "bg-brand-500 text-white" : m.score > 0.3 ? "bg-brand-50 text-brand-500" : "bg-[rgba(0,0,0,0.04)] text-[var(--text-s)]"
                      }`}>
                        {Math.round(m.score * 100)}%
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[var(--text)] truncate">{m.job.company} · {m.job.title}</div>
                        <div className="text-[11px] text-[var(--text-s)] mt-0.5 truncate">{m.reasons.slice(0, 2).join(" · ")}</div>
                      </div>
                      <span className="shrink-0 text-[11px] text-[var(--text-t)]">{m.job.location[0]}</span>
                    </a>
                  ))}
                {(activeBucket === "high" ? high : activeBucket === "mid" ? mid : activeBucket === "low" ? low : none).length > 20 && (
                  <div className="text-center text-[11px] text-[var(--text-t)] py-2">
                    仅展示前 20 个，共 {(activeBucket === "high" ? high : activeBucket === "mid" ? mid : activeBucket === "low" ? low : none).length} 个
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* 3. 简历优化建议 */}
        <section className="card p-6">
          <h2 className="text-base font-black tracking-tight text-[var(--text)] mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-brand-500" />
            简历优化建议
          </h2>
          <div className="space-y-3">
            {skillGaps.length > 0 && (
              <div className="relative p-3 rounded-[var(--radius-xs)] border border-[var(--rose-light)]">
                <span className="absolute top-2.5 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--rose-light)] text-[var(--rose)]">高优</span>
                <div className="text-xs font-medium text-[var(--text)] mb-1 pr-14">补充热门技能关键词</div>
                <div className="text-xs text-[var(--text-s)]">
                  你的简历中缺少以下市场高需求技能：<strong>{skillGaps.slice(0, 5).map((s) => s.skill).join("、")}</strong>。
                  如果你有相关经验，建议在简历中明确提及。
                </div>
              </div>
            )}
            {(prefs.targetRoles ?? []).length > 0 && (
              <div className="relative p-3 rounded-[var(--radius-xs)] border border-[var(--rose-light)]">
                <span className="absolute top-2.5 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--rose-light)] text-[var(--rose)]">高优</span>
                <div className="text-xs font-medium text-[var(--text)] mb-1 pr-14">突出目标岗位关键词</div>
                <div className="text-xs text-[var(--text-s)]">
                  你的目标岗位是 <strong>{(prefs.targetRoles ?? []).join("、")}</strong>，
                  建议简历标题和经历描述中直接出现这些关键词，提高 ATS 系统和 HR 的匹配识别率。
                </div>
              </div>
            )}
            {high.length > 0 && (
              <div className="relative p-3 rounded-[var(--radius-xs)] border border-[var(--amber-light)]">
                <span className="absolute top-2.5 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--amber-light)] text-[var(--amber)]">中优</span>
                <div className="text-xs font-medium text-[var(--text)] mb-1 pr-14">针对性定制</div>
                <div className="text-xs text-[var(--text-s)]">
                  你有 {high.length} 个高匹配岗位，Top 3 是 {high.slice(0, 3).map((m) => m.job.company).join("、")}。
                  建议针对这些公司分别准备定制版简历，突出与其岗位 JD 匹配的经历。
                </div>
              </div>
            )}
            <div className="relative p-3 rounded-[var(--radius-xs)] border border-[var(--border)]">
              <span className="absolute top-2.5 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[rgba(0,0,0,.04)] text-[var(--text-t)]">建议</span>
              <div className="text-xs font-medium text-[var(--text)] mb-1 pr-14">STAR 法则</div>
              <div className="text-xs text-[var(--text-s)]">
                每段实习/项目经历用 Situation → Task → Action → Result 结构描述，量化成果（如"提升 XX%"、"覆盖 XX 用户"）。
              </div>
            </div>
          </div>
        </section>

        {/* 4. Top 10 推荐岗位 */}
        <section className="card p-6">
          <h2 className="text-base font-black tracking-tight text-[var(--text)] mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-brand-500" />
            Top 10 推荐岗位
          </h2>
          {/* Top 3 featured */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {matches.slice(0, 3).map((m, i) => {
              const pct = Math.round(m.score * 100);
              return (
                <a key={m.job.id} href={`/job/${m.job.id}`} className="relative p-4 rounded-[var(--radius-sm)] border border-[var(--border)] hover:border-[rgba(91,76,255,.2)] hover:shadow-[var(--shadow-md)] transition block">
                  <span className="absolute -top-px -left-px w-7 h-7 bg-brand-500 text-white text-[11px] font-black flex items-center justify-center rounded-br-[var(--radius-xs)]">
                    {i + 1}
                  </span>
                  <div className="pl-5">
                    <div className="text-[13px] font-extrabold text-[var(--text)]">{m.job.company}</div>
                    <div className="text-[11px] text-brand-500 mt-0.5">{m.job.title}</div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${pct > 60 ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-500"}`}>
                      {pct}%
                    </span>
                    <span className="text-[10px] text-[var(--text-t)]">{m.job.location[0]}</span>
                  </div>
                  <div className="text-[10px] text-[var(--text-s)] mt-2 line-clamp-2 leading-relaxed">{m.reasons.join(" · ")}</div>
                </a>
              );
            })}
          </div>
          {/* 4-10 list */}
          <div className="border-t border-[var(--border)] pt-3 space-y-0">
            {matches.slice(3, 10).map((m, idx) => (
              <a key={m.job.id} href={`/job/${m.job.id}`}
                className={`flex items-start gap-3 p-3 rounded-[var(--radius-xs)] hover:bg-[var(--surface)] transition ${idx < 6 ? "border-b border-[var(--border)]" : ""}`}
              >
                <span className="shrink-0 w-6 h-6 rounded-[var(--radius-xs)] flex items-center justify-center text-xs font-bold bg-[rgba(0,0,0,0.04)] text-[var(--text-s)]">
                  {idx + 4}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--text)]">{m.job.company}</span>
                    <span className="text-[10px] font-semibold font-mono px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-500">
                      {Math.round(m.score * 100)}%
                    </span>
                  </div>
                  <div className="text-xs text-brand-500 mt-0.5">{m.job.title}</div>
                  <div className="text-[11px] text-[var(--text-s)] mt-1">{m.reasons.join(" · ")}</div>
                </div>
                <span className="shrink-0 text-xs text-[var(--text-t)]">{m.job.location[0]}</span>
              </a>
            ))}
          </div>
        </section>

        {/* 5. 技能分析 */}
        <section className="card p-6">
          <h2 className="text-base font-black tracking-tight text-[var(--text)] mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-brand-500" />
            技能分析
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-extrabold text-[var(--green)] mb-2">你已具备的热门技能</h3>
              {skillMatches.length === 0 ? (
                <p className="text-xs text-[var(--text-t)]">暂无匹配</p>
              ) : (
                <div className="space-y-1.5">
                  {skillMatches.map((s) => (
                    <div key={s.skill} className="flex items-center gap-2">
                      <span className="text-[11px] text-[var(--text)] w-16 text-right truncate shrink-0">{s.skill}</span>
                      <div className="flex-1 h-[5px] bg-[var(--green-light)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--green)] rounded-full" style={{ width: `${Math.min(100, (s.count / topMarketSkills[0].count) * 100)}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-[var(--text-t)] w-7 text-right">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-[var(--amber)] mb-2">建议补充的技能</h3>
              {skillGaps.length === 0 ? (
                <p className="text-xs text-[var(--text-t)]">无明显缺口</p>
              ) : (
                <div className="space-y-1.5">
                  {skillGaps.slice(0, 8).map((s) => (
                    <div key={s.skill} className="flex items-center gap-2">
                      <span className="text-[11px] text-[var(--text)] w-16 text-right truncate shrink-0">{s.skill}</span>
                      <div className="flex-1 h-[5px] bg-[var(--amber-light)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--amber)] rounded-full" style={{ width: `${Math.min(100, (s.count / topMarketSkills[0].count) * 100)}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-[var(--text-t)] w-7 text-right">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 6. 推荐优先投递行业 */}
        {Object.keys(industryDist).length > 0 && (
          <section className="card p-6">
            <h2 className="text-base font-black tracking-tight text-[var(--text)] mb-4 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-brand-500" />
              推荐优先投递行业
            </h2>
            <div className="space-y-1.5">
              {Object.entries(industryDist).sort((a, b) => b[1] - a[1]).map(([ind, count]) => {
                const max = Object.values(industryDist).reduce((a, b) => Math.max(a, b), 1);
                const color = INDUSTRY_COLORS[ind] ?? INDUSTRY_COLORS["其他"];
                return (
                  <div key={ind} className="flex items-center gap-2">
                    <span className="w-12 text-right text-[11px] font-semibold text-[var(--text-s)] shrink-0">{ind}</span>
                    <div className="flex-1 h-[18px] bg-[rgba(0,0,0,.03)] rounded-[3px] overflow-hidden">
                      <div className="h-full rounded-[3px] transition-all" style={{ width: `${(count / max) * 100}%`, background: color, opacity: 0.85 }} />
                    </div>
                    <span className="w-6 text-right text-[12px] font-extrabold font-mono text-[var(--text)]">{count}</span>
                  </div>
                );
              })}
            </div>
            <div className="text-[11px] text-[var(--text-t)] text-right mt-2">
              基于 {Object.values(industryDist).reduce((a, b) => a + b, 0)} 个高匹配岗位
            </div>
          </section>
        )}

        {/* 7. 紧急优先 */}
        {urgentTop.length > 0 && (
          <section className="card p-6">
            <h2 className="text-base font-black tracking-tight text-[var(--text)] mb-4 flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-[var(--rose)]" />
              投递策略 · 紧急优先
            </h2>
            <p className="text-xs text-[var(--text-s)] mb-3">以下匹配岗位即将截止，建议尽快投递：</p>
            <div className="space-y-2">
              {urgentTop.map((m) => {
                const d = m.daysLeft ?? 99;
                let badgeCls = "bg-[var(--green-light)] text-[var(--green)]";
                if (d <= 3) badgeCls = "bg-[var(--rose)] text-white";
                else if (d <= 7) badgeCls = "bg-[var(--amber)] text-white";
                return (
                  <a key={m.job.id} href={`/job/${m.job.id}`} className="flex items-center gap-3 p-2.5 rounded-[var(--radius-xs)] border border-[var(--border)] hover:border-brand-300 transition">
                    <span className={`shrink-0 text-xs font-bold font-mono px-2 py-1 rounded ${badgeCls}`}>
                      {d}天
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-[var(--text)]">{m.job.company} · {m.job.title}</span>
                    </div>
                    <span className="shrink-0 text-[10px] text-[var(--text-t)]">{m.job.deadline?.slice(0, 10)}</span>
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {/* 8. 面试题预测 */}
        <section className="card p-6">
          <h2 className="text-base font-black tracking-tight text-[var(--text)] mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-brand-500" />
            面试题预测
          </h2>
          <p className="text-xs text-[var(--text-s)] mb-3">基于你的目标岗位和技能，可能会被问到的面试题：</p>
          <div className="space-y-2">
            {generateInterviewQuestions(prefs, matches.slice(0, 5).map((m) => m.job)).map((q, i) => (
              <div key={i} className="p-3 rounded-[var(--radius-xs)] border border-[var(--border)] hover:border-brand-200 transition">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-brand-50 text-brand-500 text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <div>
                    <div className="text-sm text-[var(--text)]">{q.question}</div>
                    <div className="text-[11px] text-[var(--text-t)] mt-1">{q.category} · {q.source}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function generateInterviewQuestions(prefs: Prefs, topJobs: Job[]): { question: string; category: string; source: string }[] {
  const questions: { question: string; category: string; source: string }[] = [];
  const roles = prefs.targetRoles ?? [];
  const skills = prefs.skills ?? [];

  if (roles.some((r) => /产品/.test(r))) {
    questions.push(
      { question: "请设计一个功能来提升某产品的用户留存率", category: "产品设计", source: "产品经理高频题" },
      { question: "如何从 0 到 1 规划一个新产品？请描述你的方法论", category: "产品思维", source: "产品经理高频题" },
      { question: "给你一个数据下降的场景，你如何分析原因？", category: "数据分析", source: "产品经理高频题" },
    );
  }
  if (roles.some((r) => /管培/.test(r))) {
    questions.push(
      { question: "你为什么选择管培生而不是直接应聘某个岗位？", category: "动机", source: "管培生常见题" },
      { question: "描述一次你在团队中解决冲突的经历", category: "领导力", source: "管培生常见题" },
      { question: "如果让你在三个月内熟悉一个全新的业务线，你会怎么做？", category: "学习能力", source: "管培生常见题" },
    );
  }
  if (roles.some((r) => /数据|分析/.test(r))) {
    questions.push(
      { question: "SQL 中 LEFT JOIN 和 INNER JOIN 的区别？写一个多表关联查询", category: "技术", source: "数据分析高频题" },
      { question: "描述一次你用数据驱动决策的经历，结果如何？", category: "业务", source: "数据分析高频题" },
    );
  }
  if (skills.some((s) => /AI|人工智能|大模型|LLM/.test(s))) {
    questions.push(
      { question: "你如何理解大模型在实际产品中的应用场景和局限性？", category: "AI 认知", source: "AI 岗位高频题" },
      { question: "Prompt Engineering 的核心原则有哪些？", category: "技术", source: "AI 岗位高频题" },
    );
  }
  if (roles.some((r) => /金融|投行/.test(r)) || prefs.categories.includes("金融")) {
    questions.push(
      { question: "请简单解释 DCF 估值模型的基本步骤", category: "金融基础", source: "金融岗高频题" },
      { question: "如何看待当前中国资本市场的发展趋势？", category: "行业认知", source: "金融岗高频题" },
    );
  }

  questions.push(
    { question: "请做一分钟自我介绍", category: "基础", source: "通用高频题" },
    { question: "你的职业规划是什么？3-5 年后你希望在做什么？", category: "规划", source: "通用高频题" },
  );

  if (topJobs.length > 0) {
    questions.push({
      question: `你为什么想加入 ${topJobs[0].company}？对我们的业务有什么了解？`,
      category: "公司认知",
      source: `${topJobs[0].company} 针对性`,
    });
  }

  return questions.slice(0, 10);
}
