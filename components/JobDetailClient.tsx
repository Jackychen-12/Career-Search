"use client";

import { useEffect, useState } from "react";
import { loadPrefs } from "@/lib/prefs";
import { hasPrefs } from "@/lib/ranking";
import { computeProfileMatchDetailed, type MatchResult } from "@/lib/matchScore";
import { daysUntil } from "@/lib/scoring";
import { CATEGORY_COLORS } from "@/lib/taxonomy";
import { generateInterview, generateCoverLetter, type InterviewQuestion, type CoverLetterResult } from "@/lib/skills";
import type { Job, Prefs } from "@/lib/types";

function profileToText(p: Prefs): string {
  return [
    p.school && `学校: ${p.school}`, p.major && `专业: ${p.major}`, p.degree && `学历: ${p.degree}`,
    p.skills?.length && `技能: ${p.skills.join(", ")}`,
    p.targetRoles?.length && `目标: ${p.targetRoles.join(", ")}`,
  ].filter(Boolean).join("\n");
}

export default function JobDetailClient({ job, jobs }: { job: Job | null; jobs: Job[] }) {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [interviewQ, setInterviewQ] = useState<InterviewQuestion[] | null>(null);
  const [coverLetter, setCoverLetter] = useState<CoverLetterResult | null>(null);

  useEffect(() => {
    const p = loadPrefs();
    if (hasPrefs(p)) {
      setPrefs(p);
      if (job) setMatch(computeProfileMatchDetailed(job, p));
    }
  }, [job]);

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900 mb-2">岗位未找到</h2>
          <a href="/" className="text-sm text-brand-600">返回首页</a>
        </div>
      </div>
    );
  }

  const now = new Date();
  const dl = daysUntil(job.deadline, now);
  const urgent = dl !== null && dl >= 0 && dl <= 15;
  const similar = jobs
    .filter((j) => j.id !== job.id && (j.company === job.company || j.category === job.category))
    .slice(0, 5);

  async function genInterview() {
    if (!prefs) return;
    setLoading("interview");
    try {
      const r = await generateInterview(profileToText(prefs), `${job!.company} - ${job!.title}\n${job!.description ?? ""}\n技能: ${job!.aiTags?.skills.join(", ") ?? ""}`);
      setInterviewQ(r.questions);
    } catch {}
    setLoading(null);
  }

  async function genLetter() {
    if (!prefs) return;
    setLoading("letter");
    try {
      const r = await generateCoverLetter(profileToText(prefs), `${job!.company} - ${job!.title}\n${job!.description ?? ""}`);
      setCoverLetter(r);
    } catch {}
    setLoading(null);
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-[var(--surface)] backdrop-blur-[8px] [backdrop-filter:blur(8px)_saturate(180%)] border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href="/" className="text-[15px] font-bold text-gray-900 hover:text-brand-600 transition">← 返回</a>
          <a href={job.applyUrl} target="_blank" rel="noreferrer" className="px-4 py-1.5 rounded-[var(--radius-sm)] text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 shadow-sm transition">
            投递 →
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-gray-900">{job.company}</h1>
              <h2 className="text-base text-brand-500 font-bold mt-1">{job.title}</h2>
            </div>
            {match && match.score > 0 && (
              <div className="text-center shrink-0">
                <div className={`text-2xl font-bold ${match.score > 0.6 ? "text-brand-600" : match.score > 0.3 ? "text-amber-600" : "text-gray-500"}`}>
                  {Math.round(match.score * 100)}%
                </div>
                <div className="text-[10px] text-gray-400">匹配度</div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${CATEGORY_COLORS[job.category]}`}>{job.category}</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[rgba(0,0,0,.03)] text-gray-500">{job.jobType}</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[rgba(0,0,0,.03)] text-gray-500">{job.location.join(" / ")}</span>
            {job.salary && <span className="text-xs px-2.5 py-1 rounded-full bg-brand-50 text-brand-600 font-medium">{job.salary}</span>}
            {job.requirements && <span className="text-xs px-2.5 py-1 rounded-full bg-[rgba(0,0,0,.03)] text-gray-500">{job.requirements}</span>}
            {job.tags.map((t) => <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-[rgba(0,0,0,.03)] text-gray-500">{t}</span>)}
          </div>

          {/* Time info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="bg-[rgba(91,76,255,.02)] rounded-[var(--radius-sm)] border border-[rgba(91,76,255,.06)] p-3 text-center">
              <div className={`text-sm font-bold font-mono ${urgent ? "text-red-600" : "text-gray-900"}`}>
                {job.deadline ? job.deadline.slice(0, 10) : "滚动"}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">截止日期</div>
            </div>
            <div className="bg-[rgba(91,76,255,.02)] rounded-[var(--radius-sm)] border border-[rgba(91,76,255,.06)] p-3 text-center">
              <div className="text-sm font-bold font-mono text-gray-900">{dl !== null && dl >= 0 ? `${dl} 天` : dl !== null ? "已过" : "—"}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">剩余</div>
            </div>
            <div className="bg-[rgba(91,76,255,.02)] rounded-[var(--radius-sm)] border border-[rgba(91,76,255,.06)] p-3 text-center">
              <div className="text-sm font-bold font-mono text-gray-900">{job.firstSeen.slice(0, 10)}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">收录时间</div>
            </div>
            <div className="bg-[rgba(91,76,255,.02)] rounded-[var(--radius-sm)] border border-[rgba(91,76,255,.06)] p-3 text-center">
              <div className="text-sm font-bold font-mono text-gray-900">{job.postedAt?.slice(0, 10) ?? "—"}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">发布时间</div>
            </div>
          </div>
        </div>

        {/* Description */}
        {job.description && (
          <div className="card p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3">岗位描述</h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{job.description}</p>
          </div>
        )}

        {/* AI Analysis */}
        {job.aiTags && (
          <div className="card p-6 border-t-[3px] border-brand-500">
            <h3 className="text-sm font-bold text-gray-900 mb-3">AI 分析</h3>
            <p className="text-sm text-gray-600 mb-3">{job.aiTags.summary}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div><span className="text-[10px] text-gray-400 block">岗位方向</span><span className="text-sm font-medium">{job.aiTags.roleType}</span></div>
              <div><span className="text-[10px] text-gray-400 block">行业</span><span className="text-sm font-medium">{job.aiTags.industry}</span></div>
              <div><span className="text-[10px] text-gray-400 block">层级</span><span className="text-sm font-medium">{job.aiTags.seniority}</span></div>
              <div><span className="text-[10px] text-gray-400 block">公司层级</span><span className="text-sm font-medium">Tier {job.companyTier}</span></div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] text-gray-400">所需技能：</span>
              {job.aiTags.skills.map((s) => {
                const userHas = prefs?.skills?.some((us) => us.toLowerCase() === s.toLowerCase()) || prefs?.resumeKeywords?.some((uk) => uk.toLowerCase() === s.toLowerCase());
                return <span key={s} className={`text-[11px] px-2 py-0.5 rounded-full ${userHas ? "bg-brand-50 text-brand-500 font-medium" : "bg-gray-50 text-gray-400"}`}>{s}</span>;
              })}
            </div>
          </div>
        )}

        {/* Match reasons */}
        {match && match.reasons.length > 0 && (
          <div className="card p-6 bg-[rgba(91,76,255,.03)] border border-[rgba(91,76,255,.1)]">
            <h3 className="text-sm font-bold text-brand-700 mb-2">匹配理由</h3>
            <div className="space-y-1">
              {match.reasons.map((r, i) => (
                <div key={i} className="text-sm text-brand-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                  {r}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Actions */}
        {prefs && (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={genInterview} disabled={loading !== null} className="card p-4 text-left hover:border-brand-300 hover:-translate-y-0.5 rounded-[var(--radius-sm)] transition">
              <div className="text-lg mb-1">🎯</div>
              <div className="text-sm font-semibold text-gray-900">{loading === "interview" ? "生成中..." : "生成面试题"}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">针对这个岗位的定制面试题</div>
            </button>
            <button onClick={genLetter} disabled={loading !== null} className="card p-4 text-left hover:border-brand-300 hover:-translate-y-0.5 rounded-[var(--radius-sm)] transition">
              <div className="text-lg mb-1">✉️</div>
              <div className="text-sm font-semibold text-gray-900">{loading === "letter" ? "生成中..." : "生成求职信"}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">针对这个岗位的定制求职信</div>
            </button>
          </div>
        )}

        {/* Interview questions result */}
        {interviewQ && (
          <div className="card p-6 space-y-3">
            <h3 className="text-sm font-bold text-gray-900">面试题（{interviewQ.length} 道）</h3>
            {interviewQ.map((q, i) => (
              <div key={i} className="p-3 rounded-[var(--radius-xs)] border border-gray-100">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-brand-50 text-brand-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{q.question}</div>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(0,0,0,.03)] text-gray-500">{q.category}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(0,0,0,.03)] text-gray-500">{q.difficulty}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2"><strong>要点：</strong>{q.tips}</div>
                    <div className="text-xs text-gray-400 mt-1"><strong>参考：</strong>{q.sample}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cover letter result */}
        {coverLetter && (
          <div className="card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">求职信</h3>
              <button onClick={() => navigator.clipboard.writeText(coverLetter.letter).then(() => alert("已复制"))} className="text-xs text-brand-600">复制</button>
            </div>
            <div className="p-4 rounded-[var(--radius-xs)] bg-[var(--surface-solid)] text-sm text-gray-700 whitespace-pre-line leading-relaxed">{coverLetter.letter}</div>
          </div>
        )}

        {/* Similar jobs */}
        {similar.length > 0 && (
          <div className="card p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3">相关岗位</h3>
            <div className="space-y-2">
              {similar.map((j) => (
                <a key={j.id} href={`/job/${j.id}`} className="flex items-center gap-3 p-2.5 rounded-[var(--radius-xs)] hover:bg-[rgba(91,76,255,.03)] transition">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{j.company} · {j.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{j.location[0]} · {j.jobType}</div>
                  </div>
                  <span className="text-xs text-gray-400">→</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Apply CTA */}
        <div className="text-center py-4">
          <a href={job.applyUrl} target="_blank" rel="noreferrer" className="inline-block px-8 py-3 rounded-[var(--radius-sm)] text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-sm transition">
            前往投递 →
          </a>
        </div>
      </main>
    </div>
  );
}
