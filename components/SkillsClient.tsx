"use client";

import { useEffect, useMemo, useState } from "react";
import { loadPrefs } from "@/lib/prefs";
import { hasPrefs } from "@/lib/ranking";
import { getSession } from "@/lib/auth";
import { generateInterview, followupInterview, generateCoverLetter, refineCoverLetter, compareOffers, analyzeJdMatch, compareJds, optimizeResume } from "@/lib/skills";
import type { InterviewQuestion, CoverLetterResult, OfferCompareResult, JdMatchResult, JdCompareResult, ResumeOptimizeResult } from "@/lib/skills";
import type { Job, Prefs } from "@/lib/types";

type Skill = "interview" | "resume-optimize" | "cover-letter" | "offer" | "jd-match" | "jd-compare";

const SKILLS: { key: Skill; label: string; desc: string; icon: string }[] = [
  { key: "interview", label: "面试题定制", desc: "根据你的背景和目标岗位，AI 生成针对性面试题+参考答案", icon: "🎯" },
  { key: "resume-optimize", label: "简历优化", desc: "AI 逐句分析简历，优先级改写建议 + 导出定制简历", icon: "📝" },
  { key: "cover-letter", label: "求职信生成", desc: "根据目标岗位 JD，生成定制化求职信", icon: "✉️" },
  { key: "offer", label: "Offer 对比", desc: "多个 Offer 横向对比，综合分析给出推荐", icon: "⚖️" },
  { key: "jd-match", label: "JD 匹配分析", desc: "深度分析简历与 JD 匹配度，关键词高亮+差距分析", icon: "🔍" },
  { key: "jd-compare", label: "多 JD 对比", desc: "批量对比多个岗位匹配度，智能排序投递优先级", icon: "📊" },
];

function profileToText(p: Prefs): string {
  const parts = [];
  if (p.school) parts.push(`学校: ${p.school}`);
  if (p.major) parts.push(`专业: ${p.major}`);
  if (p.degree) parts.push(`学历: ${p.degree}`);
  if (p.skills?.length) parts.push(`技能: ${p.skills.join(", ")}`);
  if (p.targetRoles?.length) parts.push(`目标岗位: ${p.targetRoles.join(", ")}`);
  if (p.categories?.length) parts.push(`意向行业: ${p.categories.join(", ")}`);
  if (p.cities?.length) parts.push(`意向城市: ${p.cities.join(", ")}`);
  if (p.summary) parts.push(`概述: ${p.summary}`);
  if (p.strengths?.length) parts.push(`优势: ${p.strengths.join(", ")}`);
  if (p.weaknesses?.length) parts.push(`待提升: ${p.weaknesses.join(", ")}`);
  if (p.experiences?.length) {
    parts.push("经历:");
    p.experiences.forEach((e, i) => {
      const line = [`${i + 1}. ${e.company} · ${e.role}`];
      if (e.department) line[0] += ` · ${e.department}`;
      if (e.duration) line.push(`   时间: ${e.duration}`);
      if (e.industry) line.push(`   行业: ${e.industry}`);
      if (e.skills.length) line.push(`   技能: ${e.skills.join(", ")}`);
      if (e.highlights.length) line.push(`   成果: ${e.highlights.join("; ")}`);
      if (e.description) line.push(`   描述: ${e.description}`);
      parts.push(line.join("\n"));
    });
  } else if (p.experience?.length) {
    parts.push(`经历:\n${p.experience.join("\n")}`);
  }
  return parts.join("\n");
}

function exportPDF(sections: { title: string; content: string }[], name: string) {
  const html = sections
    .map(
      (s) =>
        `<div style="margin-bottom:18px"><h2 style="font-size:15px;font-weight:700;color:#1a1a1a;margin:0 0 6px;border-bottom:1px solid #e5e7eb;padding-bottom:4px">${s.title}</h2><div style="font-size:13px;color:#374151;line-height:1.7;white-space:pre-line">${s.content}</div></div>`
    )
    .join("");
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name} - 简历</title><style>@page{margin:20mm 18mm}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:700px;margin:0 auto;padding:24px;color:#1a1a1a}@media print{body{padding:0}}</style></head><body>${html}</body></html>`
  );
  w.document.close();
  w.print();
}

function exportWord(sections: { title: string; content: string }[], name: string) {
  const body = sections
    .map(
      (s) =>
        `<h2 style="font-size:14pt;font-weight:bold;color:#1a1a1a;border-bottom:1pt solid #ccc;padding-bottom:4pt;margin-bottom:6pt">${s.title}</h2><p style="font-size:11pt;color:#333;line-height:1.8;white-space:pre-line">${s.content}</p>`
    )
    .join("");
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>body{font-family:"Microsoft YaHei","SimSun",sans-serif;padding:20pt}</style></head><body>${body}</body></html>`;
  const blob = new Blob(["\ufeff" + html], { type: "application/msword" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name}_简历.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

export default function SkillsClient({ jobs }: { jobs: Job[] }) {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [active, setActive] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [jobInput, setJobInput] = useState("");
  const [expInput, setExpInput] = useState("");
  const [offersInput, setOffersInput] = useState("");
  const [jdsInput, setJdsInput] = useState("");
  const [interviewResult, setInterviewResult] = useState<InterviewQuestion[] | null>(null);
  const [letterResult, setLetterResult] = useState<CoverLetterResult | null>(null);
  const [offerResult, setOfferResult] = useState<OfferCompareResult | null>(null);
  const [jdMatchResult, setJdMatchResult] = useState<JdMatchResult | null>(null);
  const [jdCompareResult, setJdCompareResult] = useState<JdCompareResult | null>(null);
  const [optimizeResult, setOptimizeResult] = useState<ResumeOptimizeResult | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<number>>(new Set());
  const [displaySections, setDisplaySections] = useState<{ title: string; content: string }[]>([]);
  const [interviewFollowupInput, setInterviewFollowupInput] = useState("");
  const [interviewFollowupLoading, setInterviewFollowupLoading] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [letterText, setLetterText] = useState("");
  const [letterRefineInput, setLetterRefineInput] = useState("");
  const [letterRefineLoading, setLetterRefineLoading] = useState(false);
  const [letterChanges, setLetterChanges] = useState("");
  const [jobSearchQuery, setJobSearchQuery] = useState("");

  const searchedJobs = useMemo(() => {
    const q = jobSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return jobs.filter((j) => {
      const text = [j.company, j.title, j.description ?? "", ...j.location, ...j.tags, ...(j.aiTags?.skills ?? [])].join(" ").toLowerCase();
      return text.includes(q);
    }).slice(0, 20);
  }, [jobs, jobSearchQuery]);

  useEffect(() => {
    const p = loadPrefs();
    if (hasPrefs(p)) setPrefs(p);
    getSession().then((s) => setLoggedIn(!!s));
  }, []);

  useEffect(() => {
    if (optimizeResult?.resumeOriginal?.sections) {
      setDisplaySections(optimizeResult.resumeOriginal.sections.map((s) => ({ ...s })));
    }
  }, [optimizeResult]);

  useEffect(() => {
    if (letterResult?.letter) {
      setLetterText(letterResult.letter);
      setLetterChanges("");
    }
  }, [letterResult]);

  async function run() {
    if (!prefs || !active) return;
    setLoading(true);
    setError("");
    const profile = profileToText(prefs);
    try {
      if (active === "interview") {
        const r = await generateInterview(profile, jobInput);
        setInterviewResult(r.questions);
      } else if (active === "resume-optimize") {
        const r = await optimizeResume(profile, jobInput, expInput);
        setOptimizeResult(r);
        setAppliedIds(new Set());
      } else if (active === "cover-letter") {
        const r = await generateCoverLetter(profile, jobInput);
        setLetterResult(r);
      } else if (active === "offer") {
        const r = await compareOffers(profile, offersInput);
        setOfferResult(r);
      } else if (active === "jd-match") {
        const r = await analyzeJdMatch(profile, jobInput);
        setJdMatchResult(r);
      } else if (active === "jd-compare") {
        const r = await compareJds(profile, jdsInput);
        setJdCompareResult(r);
      }
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }

  async function runInterviewDirect() {
    if (!prefs) return;
    setLoading(true);
    setError("");
    const profile = profileToText(prefs);
    const job = prefs.targetRoles?.join("、") ?? "";
    try {
      const r = await generateInterview(profile, job);
      setInterviewResult(r.questions);
      setExpandedQuestions(new Set());
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }

  async function runInterviewFollowup() {
    if (!prefs || !interviewResult?.length || !interviewFollowupInput.trim()) return;
    setInterviewFollowupLoading(true);
    setError("");
    const profile = profileToText(prefs);
    const job = prefs.targetRoles?.join("、") ?? "";
    const previous = interviewResult.map((q, i) => `${i + 1}. [${q.category}] ${q.question}`).join("\n");
    try {
      const r = await followupInterview(profile, job, previous, interviewFollowupInput);
      setInterviewResult([...interviewResult, ...r.questions]);
      setInterviewFollowupInput("");
    } catch (e) {
      setError((e as Error).message);
    }
    setInterviewFollowupLoading(false);
  }

  async function runLetterRefine(instruction?: string) {
    if (!prefs || !letterText.trim()) return;
    const refineInstruction = instruction || letterRefineInput.trim();
    if (!refineInstruction) return;
    setLetterRefineLoading(true);
    setError("");
    const profile = profileToText(prefs);
    try {
      const r = await refineCoverLetter(profile, jobInput, letterText, refineInstruction);
      setLetterText(r.letter);
      setLetterResult(r);
      setLetterChanges(r.changes || "");
      setLetterRefineInput("");
    } catch (e) {
      setError((e as Error).message);
    }
    setLetterRefineLoading(false);
  }

  function applySuggestion(suggestion: { section: string; original: string; improved: string; id: number }) {
    setDisplaySections((prev) =>
      prev.map((s) => {
        if (s.content.includes(suggestion.original)) {
          return { ...s, content: s.content.replace(suggestion.original, suggestion.improved) };
        }
        return s;
      })
    );
    setAppliedIds((prev) => new Set([...prev, suggestion.id]));
  }

  function applyAll() {
    if (!optimizeResult) return;
    setDisplaySections(optimizeResult.resume.sections.map((s) => ({ ...s })));
    setAppliedIds(new Set(optimizeResult.suggestions.map((s) => s.id)));
  }


  const groupedSuggestions = optimizeResult
    ? optimizeResult.suggestions.reduce<Record<string, typeof optimizeResult.suggestions>>((acc, s) => {
        const key = s.section || "其他";
        if (!acc[key]) acc[key] = [];
        acc[key].push(s);
        return acc;
      }, {})
    : {};

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/60 border-b border-black/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-[15px] font-bold text-gray-900 hover:text-brand-600 transition">← Career Search</a>
            <span className="text-gray-300">·</span>
            <span className="text-[14px] font-medium text-gray-700">AI 求职工具</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {!loggedIn || !prefs ? (
          <div className="card p-12 text-center">
            <h2 className="text-lg font-bold text-gray-900 mb-2">请先登录并设置画像</h2>
            <p className="text-sm text-gray-500 mb-4">AI 工具需要你的背景信息才能生成针对性内容</p>
            <a href="/profile/" className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition">去设置画像</a>
          </div>
        ) : (
          <>
            {/* Skill cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SKILLS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => {
                    setActive(s.key);
                    setInterviewResult(null); setLetterResult(null); setOfferResult(null); setJdMatchResult(null); setJdCompareResult(null); setOptimizeResult(null); setAppliedIds(new Set()); setExpandedQuestions(new Set()); setInterviewFollowupInput(""); setError(""); setDisplaySections([]); setLetterText(""); setLetterRefineInput(""); setLetterRefineLoading(false); setLetterChanges(""); setJobSearchQuery("");
                    if (s.key === "resume-optimize" && !expInput && prefs) {
                      if (prefs.experiences?.length) {
                        setExpInput(prefs.experiences.map((e) => `${e.duration ?? ""} ${e.company} ${e.role}\n${e.description ?? ""}\n成果: ${e.highlights.join("; ")}`).join("\n\n"));
                      } else if (prefs.experience?.length) {
                        setExpInput(prefs.experience.join("\n"));
                      }
                    }
                    if (["resume-optimize", "cover-letter", "jd-match"].includes(s.key) && !jobInput && prefs?.targetRoles?.length) {
                      setJobInput(prefs.targetRoles.join("、"));
                    }
                    if (s.key === "interview" && prefs) {
                      runInterviewDirect();
                    }
                  }}
                  className={`card p-4 text-left transition ${active === s.key ? "border-brand-500 shadow-md" : "hover:border-gray-300"}`}
                >
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className="text-sm font-semibold text-gray-900">{s.label}</div>
                  <div className="text-[11px] text-gray-500 mt-1">{s.desc}</div>
                </button>
              ))}
            </div>

            {/* Input area — skip for interview (auto-generates from profile) */}
            {active && active !== "interview" && (
              <div className="card p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-900">{SKILLS.find((s) => s.key === active)?.label}</h3>

                <div className="p-3 rounded-lg bg-brand-50/60 border border-brand-100 flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold">AI</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-brand-700 mb-1">已自动加载你的画像</div>
                    <div className="text-[11px] text-brand-600 truncate">
                      {[prefs?.school, prefs?.major, prefs?.degree].filter(Boolean).join(" · ")}
                      {(prefs?.skills?.length ?? 0) > 0 && ` · ${prefs!.skills!.slice(0, 3).join(", ")}${prefs!.skills!.length > 3 ? "..." : ""}`}
                    </div>
                    {((prefs?.experiences?.length ?? 0) > 0 || (prefs?.experience?.length ?? 0) > 0) && (
                      <div className="text-[11px] text-brand-500 mt-0.5">{prefs!.experiences?.length ?? prefs!.experience!.length} 段经历已就绪</div>
                    )}
                  </div>
                  <a href="/profile/" className="shrink-0 text-[11px] text-brand-600 hover:text-brand-700 underline">修改</a>
                </div>

                {(active === "resume-optimize" || active === "cover-letter" || active === "jd-match") && (
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 mb-1 block">目标岗位（搜索导入或粘贴 JD）</label>
                    <div className="relative">
                      <input
                        value={jobSearchQuery}
                        onChange={(e) => setJobSearchQuery(e.target.value)}
                        placeholder="搜索公司、岗位名、城市..."
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
                      />
                      <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    {searchedJobs.length > 0 && (
                      <div className="max-h-[200px] overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-50">
                        {searchedJobs.map((j) => (
                          <button
                            key={j.id}
                            onClick={() => {
                              setJobInput(`${j.company} - ${j.title}\n${j.description ?? ""}\n技能要求: ${j.aiTags?.skills.join(", ") ?? ""}`);
                              setJobSearchQuery("");
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-brand-50/50 transition flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-gray-900 truncate">{j.company} · {j.title}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-gray-400">{j.location[0] ?? ""}</span>
                                {j.aiTags?.skills.slice(0, 3).map((s) => (
                                  <span key={s} className="text-[10px] px-1 py-0 rounded bg-gray-100 text-gray-500">{s}</span>
                                ))}
                              </div>
                            </div>
                            <span className="shrink-0 text-[10px] text-brand-600 font-medium">导入</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <textarea
                      value={jobInput}
                      onChange={(e) => setJobInput(e.target.value)}
                      placeholder="如：字节跳动 AI产品经理，或粘贴完整 JD..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:border-brand-500"
                    />
                  </div>
                )}

                {active === "resume-optimize" && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">你的经历描述（每段经历用换行分隔）</label>
                    <textarea
                      value={expInput}
                      onChange={(e) => setExpInput(e.target.value)}
                      placeholder="如：\n2025.6-2025.9 字节跳动 产品运营实习\n- 负责抖音电商活动策划\n- 用户增长10%..."
                      rows={5}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:border-brand-500"
                    />
                  </div>
                )}

                {active === "offer" && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">待对比的 Offer（每个 Offer 用空行分隔）</label>
                    <textarea
                      value={offersInput}
                      onChange={(e) => setOffersInput(e.target.value)}
                      placeholder="Offer 1: 字节跳动 AI产品经理, 月薪25K, 北京, 期权...\n\nOffer 2: 腾讯 产品策划, 月薪22K, 深圳, 年终奖..."
                      rows={6}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:border-brand-500"
                    />
                  </div>
                )}

                {active === "jd-compare" && (
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 mb-1 block">待对比的岗位 JD（搜索导入或手动输入，用 --- 分隔）</label>
                    <div className="relative">
                      <input
                        value={jobSearchQuery}
                        onChange={(e) => setJobSearchQuery(e.target.value)}
                        placeholder="搜索公司、岗位名、城市..."
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
                      />
                      <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    {searchedJobs.length > 0 && (
                      <div className="max-h-[200px] overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-50">
                        {searchedJobs.map((j) => (
                          <button
                            key={j.id}
                            onClick={() => {
                              setJdsInput((prev) => (prev ? prev + "\n---\n" : "") + `${j.company} - ${j.title}\n${j.description ?? ""}\n技能要求: ${j.aiTags?.skills.join(", ") ?? ""}`);
                              setJobSearchQuery("");
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-brand-50/50 transition flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-gray-900 truncate">{j.company} · {j.title}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-gray-400">{j.location[0] ?? ""}</span>
                                {j.aiTags?.skills.slice(0, 3).map((s) => (
                                  <span key={s} className="text-[10px] px-1 py-0 rounded bg-gray-100 text-gray-500">{s}</span>
                                ))}
                              </div>
                            </div>
                            <span className="shrink-0 text-[10px] text-brand-600 font-medium">+ 添加</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <textarea
                      value={jdsInput}
                      onChange={(e) => setJdsInput(e.target.value)}
                      placeholder="字节跳动 AI产品经理\n岗位职责：...\n任职要求：...\n---\n腾讯 数据产品经理\n岗位职责：...\n任职要求：..."
                      rows={8}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:border-brand-500"
                    />
                  </div>
                )}

                {error && <div className="p-3 rounded-lg bg-red-50 text-xs text-red-600">{error}</div>}

                <button
                  onClick={run}
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 shadow-sm transition"
                >
                  {loading ? "AI 生成中..." : "生成"}
                </button>
              </div>
            )}

            {/* ── 面试题定制结果 ── */}
            {active === "interview" && (
              <div className="space-y-4">
                {loading && !interviewResult && (
                  <div className="card p-12 text-center">
                    <div className="text-brand-600 font-medium text-sm">AI 正在根据你的画像生成面试题...</div>
                    <div className="text-[11px] text-gray-400 mt-2">{[prefs?.school, prefs?.major, ...(prefs?.targetRoles ?? []).slice(0, 2)].filter(Boolean).join(" · ")}</div>
                  </div>
                )}

                {error && !interviewResult && (
                  <div className="card p-5">
                    <div className="p-3 rounded-lg bg-red-50 text-xs text-red-600 mb-3">{error}</div>
                    <button onClick={runInterviewDirect} className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 shadow-sm transition">
                      重新生成
                    </button>
                  </div>
                )}

                {interviewResult && interviewResult.length > 0 && (
                  <div className="card p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-gray-900">面试题（{interviewResult.length} 道）</h3>
                      <button
                        onClick={() => setExpandedQuestions(expandedQuestions.size === interviewResult.length ? new Set() : new Set(interviewResult.map((_, i) => i)))}
                        className="text-[11px] text-brand-600 hover:text-brand-700"
                      >
                        {expandedQuestions.size === interviewResult.length ? "全部收起" : "展开全部答案"}
                      </button>
                    </div>
                    {interviewResult.map((q, i) => {
                      const isExpanded = expandedQuestions.has(i);
                      return (
                        <div key={i} className="rounded-lg border border-gray-100 overflow-hidden">
                          <button
                            onClick={() => setExpandedQuestions((prev) => {
                              const next = new Set(prev);
                              if (next.has(i)) next.delete(i); else next.add(i);
                              return next;
                            })}
                            className="w-full p-3 text-left flex items-start gap-2 hover:bg-gray-50/50 transition"
                          >
                            <span className="shrink-0 w-6 h-6 rounded-full bg-brand-50 text-brand-600 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900">{q.question}</div>
                              <div className="flex gap-2 mt-1.5">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                  q.category === "技术" ? "bg-blue-50 text-blue-600" :
                                  q.category === "业务" ? "bg-purple-50 text-purple-600" :
                                  q.category === "行为" ? "bg-green-50 text-green-600" :
                                  "bg-amber-50 text-amber-600"
                                }`}>{q.category}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                  q.difficulty === "困难" ? "bg-red-50 text-red-600" :
                                  q.difficulty === "中等" ? "bg-amber-50 text-amber-600" :
                                  "bg-green-50 text-green-600"
                                }`}>{q.difficulty}</span>
                              </div>
                            </div>
                            <span className={`shrink-0 text-gray-400 text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                          </button>
                          {isExpanded && (
                            <div className="px-3 pb-3 pt-0 ml-8 mr-3 space-y-2 border-t border-gray-50">
                              <div className="pt-2">
                                <div className="text-[11px] font-semibold text-brand-700 mb-1">回答要点</div>
                                <div className="text-xs text-gray-600 leading-relaxed">{q.tips}</div>
                              </div>
                              <div className="p-2.5 rounded-lg bg-gray-50">
                                <div className="text-[11px] font-semibold text-gray-700 mb-1">参考答案</div>
                                <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{q.sample}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {interviewResult && interviewResult.length > 0 && (
                  <div className="card p-5 space-y-3">
                    <h3 className="text-sm font-bold text-gray-900">继续追问</h3>
                    <textarea
                      value={interviewFollowupInput}
                      onChange={(e) => setInterviewFollowupInput(e.target.value)}
                      placeholder="如：再来几道技术题 / 针对字节跳动追问 / 考察数据分析能力的题 / 行为面试题..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:border-brand-500"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[10px] text-gray-400">快速追问：</span>
                      {["再来几道技术题", "行为面试题", "压力面试题", "HR 面常见题"].map((t) => (
                        <button key={t} onClick={() => { setInterviewFollowupInput(t); }}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-600 transition">
                          {t}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={runInterviewFollowup}
                      disabled={interviewFollowupLoading || !interviewFollowupInput.trim()}
                      className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 shadow-sm transition"
                    >
                      {interviewFollowupLoading ? "AI 生成中..." : "追问生成"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── 简历优化结果（双栏） ── */}
            {optimizeResult && active === "resume-optimize" && (
              <div className="card p-5 space-y-4">
                {/* Score comparison bar */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">原简历</span>
                    <span className={`text-xl font-bold ${optimizeResult.originalScore >= 60 ? "text-amber-600" : "text-red-500"}`}>{optimizeResult.originalScore}分</span>
                  </div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden relative">
                    <div className="absolute h-full bg-gray-300 rounded-full" style={{ width: `${optimizeResult.originalScore}%` }} />
                    <div className="absolute h-full bg-brand-500 rounded-full transition-all" style={{ width: `${optimizeResult.optimizedScore}%`, opacity: 0.3 }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">优化版</span>
                    <span className="text-xl font-bold text-brand-600">{optimizeResult.optimizedScore}分</span>
                  </div>
                </div>

                {/* Apply all button */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">
                    改写建议
                    <span className="ml-2 text-xs font-normal text-gray-400">{optimizeResult.suggestions.length} 条 · 按段落分组</span>
                  </h3>
                  <div className="flex gap-2">
                    {appliedIds.size > 0 && (
                      <button
                        onClick={() => {
                          setAppliedIds(new Set());
                          if (optimizeResult.resumeOriginal?.sections) {
                            setDisplaySections(optimizeResult.resumeOriginal.sections.map((s) => ({ ...s })));
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                      >
                        重置
                      </button>
                    )}
                    <button
                      onClick={applyAll}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition"
                    >
                      一键全部应用
                    </button>
                  </div>
                </div>

                {/* Two-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left: Suggestions grouped by section */}
                  <div className="space-y-4 lg:max-h-[700px] lg:overflow-y-auto lg:pr-2">
                    {Object.entries(groupedSuggestions).map(([section, suggestions]) => (
                      <div key={section}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-gray-700">{section}</span>
                          <span className="text-[10px] text-gray-400">({suggestions.length}条建议)</span>
                        </div>
                        <div className="space-y-2.5">
                          {suggestions.map((s) => {
                            const applied = appliedIds.has(s.id);
                            return (
                              <div key={s.id} className={`p-3 rounded-lg border transition ${applied ? "border-green-200 bg-green-50/50" : "border-gray-100 bg-white"}`}>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`shrink-0 w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${applied ? "bg-green-500" : "bg-red-500"}`}>
                                      {applied ? "✓" : String(s.id).padStart(2, "0")}
                                    </span>
                                    <span className="text-xs font-bold text-gray-900">{s.title}</span>
                                  </div>
                                  <span className="shrink-0 text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">{s.impact}</span>
                                </div>
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {s.tags.map((t) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{t}</span>)}
                                </div>
                                <div className="text-[11px] text-gray-400 mb-1">BEFORE</div>
                                <div className="text-xs text-gray-500 line-through mb-2">{s.original}</div>
                                <div className="text-[11px] text-brand-600 mb-1">AFTER</div>
                                <div className="text-xs text-gray-900 font-medium mb-2">{s.improved}</div>
                                <div className="text-[11px] text-gray-400 mb-2">{s.reason}</div>
                                {!applied && (
                                  <button
                                    onClick={() => applySuggestion(s)}
                                    className="text-[11px] px-3 py-1 rounded-md bg-brand-500 text-white hover:bg-brand-600 transition"
                                  >
                                    应用此建议
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Direction Advice Panel */}
                    {optimizeResult.directionAdvice && (
                      <div className="mt-4 p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3">
                        <h4 className="text-xs font-bold text-gray-800">方向参考</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <div className="text-[11px] font-semibold text-green-700 mb-1.5">必备技能</div>
                            <div className="flex flex-wrap gap-1">
                              {optimizeResult.directionAdvice.skillsRequired.map((s) => (
                                <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">{s}</span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] font-semibold text-blue-700 mb-1.5">加分技能</div>
                            <div className="flex flex-wrap gap-1">
                              {optimizeResult.directionAdvice.skillsBonus.map((s) => (
                                <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">{s}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                        {optimizeResult.directionAdvice.keyMetrics.length > 0 && (
                          <div>
                            <div className="text-[11px] font-semibold text-purple-700 mb-1.5">关键量化指标</div>
                            <div className="flex flex-wrap gap-1">
                              {optimizeResult.directionAdvice.keyMetrics.map((m) => (
                                <span key={m} className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">{m}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {optimizeResult.directionAdvice.commonMistakes.length > 0 && (
                          <div>
                            <div className="text-[11px] font-semibold text-red-600 mb-1.5">常见错误</div>
                            <ul className="space-y-1">
                              {optimizeResult.directionAdvice.commonMistakes.map((m) => (
                                <li key={m} className="text-[10px] text-red-500 flex items-start gap-1">
                                  <span className="mt-0.5 shrink-0">!</span><span>{m}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Resume preview + export */}
                  <div className="lg:max-h-[700px] lg:overflow-y-auto">
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-gray-700">
                          {appliedIds.size === optimizeResult.suggestions.length ? "优化版简历" : "简历预览"}
                          <span className="ml-1.5 text-[10px] font-normal text-gray-400">{appliedIds.size}/{optimizeResult.suggestions.length} 处已应用</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => exportPDF(displaySections, prefs?.school ?? "简历")}
                            className="text-[11px] px-2.5 py-1 rounded-md bg-brand-500 text-white hover:bg-brand-600 font-medium transition"
                          >
                            PDF
                          </button>
                          <button
                            onClick={() => exportWord(displaySections, prefs?.school ?? "简历")}
                            className="text-[11px] px-2.5 py-1 rounded-md bg-blue-500 text-white hover:bg-blue-600 font-medium transition"
                          >
                            Word
                          </button>
                          <button
                            onClick={() => {
                              const text = displaySections.map((s) => `【${s.title}】\n${s.content}`).join("\n\n");
                              navigator.clipboard.writeText(text).then(() => alert("已复制到剪贴板"));
                            }}
                            className="text-[11px] px-2.5 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 font-medium transition"
                          >
                            复制
                          </button>
                        </div>
                      </div>
                      {displaySections.map((s, i) => (
                        <div key={i} className={`px-5 py-3 ${i > 0 ? "border-t border-gray-100" : ""}`}>
                          <div className="text-xs font-bold text-gray-800 mb-1.5">{s.title}</div>
                          <div className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">{s.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Keywords + tips */}
                <div className="flex flex-wrap gap-1.5">
                  {optimizeResult.keywords.map((k) => <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-600">{k}</span>)}
                </div>
                {optimizeResult.tips && <p className="text-xs text-gray-500"><strong>投递建议：</strong>{optimizeResult.tips}</p>}
              </div>
            )}

            {letterResult && (
              <div className="card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">求职信</h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => navigator.clipboard.writeText(letterText).then(() => alert("已复制"))}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 font-medium transition"
                    >
                      复制
                    </button>
                    <button
                      onClick={() => exportWord([{ title: "求职信", content: letterText }], "求职信")}
                      className="text-[11px] px-2.5 py-1 rounded-md bg-blue-500 text-white hover:bg-blue-600 font-medium transition"
                    >
                      Word
                    </button>
                  </div>
                </div>

                <textarea
                  value={letterText}
                  onChange={(e) => setLetterText(e.target.value)}
                  rows={14}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm text-gray-700 leading-relaxed resize-y focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                />

                {letterChanges && (
                  <div className="px-3 py-2 rounded-lg bg-green-50 border border-green-100 text-xs text-green-700">
                    本次修改：{letterChanges}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {letterResult.highlights.map((h) => <span key={h} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-600">{h}</span>)}
                </div>
                {letterResult.tips && <p className="text-xs text-gray-500">{letterResult.tips}</p>}

                <div className="border-t border-gray-100 pt-3 space-y-3">
                  <h4 className="text-xs font-bold text-gray-700">AI 修改</h4>
                  <textarea
                    value={letterRefineInput}
                    onChange={(e) => setLetterRefineInput(e.target.value)}
                    placeholder="如：让开头更有吸引力 / 突出Python技能 / 语气更正式 / 缩短到300字..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:border-brand-500"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] text-gray-400">快速修改：</span>
                    {["更正式", "更简洁", "突出实习经历", "加强技术能力描述", "调整开头更有吸引力", "缩短到300字"].map((t) => (
                      <button key={t} onClick={() => runLetterRefine(t)}
                        disabled={letterRefineLoading}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-600 transition disabled:opacity-50">
                        {t}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => runLetterRefine()}
                    disabled={letterRefineLoading || !letterRefineInput.trim()}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 shadow-sm transition"
                  >
                    {letterRefineLoading ? "AI 修改中..." : "AI 修改"}
                  </button>
                </div>

                <button
                  onClick={run}
                  disabled={loading}
                  className="w-full py-2 rounded-lg text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 transition"
                >
                  重新生成（从零开始）
                </button>
              </div>
            )}

            {offerResult && (
              <div className="card p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Offer 对比分析</h3>
                {offerResult.comparison.map((c) => (
                  <div key={c.dimension} className="p-3 rounded-lg border border-gray-100">
                    <div className="text-xs font-bold text-gray-700 mb-1">{c.dimension}</div>
                    <div className="text-xs text-gray-600">{c.analysis}</div>
                  </div>
                ))}
                <div className="p-4 rounded-lg bg-brand-50">
                  <div className="text-sm font-bold text-brand-700 mb-1">推荐：{offerResult.recommendation}</div>
                  <div className="text-xs text-brand-600">{offerResult.reason}</div>
                </div>
                <div className="text-xs text-gray-500"><strong>风险提示：</strong>{offerResult.risks}</div>
                <div className="text-xs text-gray-500"><strong>谈薪建议：</strong>{offerResult.negotiation}</div>
              </div>
            )}

            {/* ── JD 匹配分析结果 ── */}
            {jdMatchResult && (
              <div className="card p-5 space-y-5">
                <div className="flex items-start gap-5">
                  <div className="flex-none">
                    <svg width="100" height="100" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                      <circle cx="50" cy="50" r="42" fill="none"
                        stroke={jdMatchResult.matchScore >= 80 ? "#22c55e" : jdMatchResult.matchScore >= 60 ? "#f59e0b" : "#ef4444"}
                        strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={`${jdMatchResult.matchScore * 2.64} 264`}
                        transform="rotate(-90 50 50)"
                      />
                      <text x="50" y="46" textAnchor="middle" className="text-2xl font-bold" fill="currentColor" fontSize="22">{jdMatchResult.matchScore}</text>
                      <text x="50" y="62" textAnchor="middle" fill="#94a3b8" fontSize="10">匹配度</text>
                    </svg>
                  </div>
                  <div className="flex-1 space-y-2.5">
                    <h3 className="text-sm font-bold text-gray-900">模块分析</h3>
                    {jdMatchResult.modules.map((m) => (
                      <div key={m.name} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-700 font-medium">{m.name}</span>
                          <span className={`text-xs font-bold ${m.score >= 80 ? "text-green-600" : m.score >= 60 ? "text-amber-600" : "text-red-500"}`}>{m.score}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${m.score >= 80 ? "bg-green-500" : m.score >= 60 ? "bg-amber-500" : "bg-red-400"}`} style={{ width: `${m.score}%` }} />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {m.matched.map((k) => <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700">{k}</span>)}
                          {m.missing.map((k) => <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600">{k}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-2">JD 关键词匹配</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {jdMatchResult.jdKeywords.map((k) => {
                      const isMatched = jdMatchResult.matchedKeywords.includes(k);
                      return (
                        <span key={k} className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${isMatched ? "bg-green-100 text-green-700 ring-1 ring-green-300" : "bg-red-50 text-red-500 ring-1 ring-red-200"}`}>
                          {isMatched ? "✓ " : "✗ "}{k}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-2">优化建议</h4>
                  <div className="space-y-1.5">
                    {jdMatchResult.suggestions.map((s, i) => (
                      <div key={i} className="flex gap-2 text-xs text-gray-600">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-brand-50 text-brand-600 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── 多 JD 对比结果 ── */}
            {jdCompareResult && (
              <div className="card p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-900">岗位匹配排名</h3>
                <div className="space-y-3">
                  {jdCompareResult.rankings.map((r) => (
                    <div key={r.rank} className="p-4 rounded-lg border border-gray-100 flex items-start gap-4">
                      <div className="flex-none">
                        <svg width="56" height="56" viewBox="0 0 56 56">
                          <circle cx="28" cy="28" r="23" fill="none" stroke="#e2e8f0" strokeWidth="5" />
                          <circle cx="28" cy="28" r="23" fill="none"
                            stroke={r.score >= 80 ? "#22c55e" : r.score >= 60 ? "#f59e0b" : "#ef4444"}
                            strokeWidth="5" strokeLinecap="round"
                            strokeDasharray={`${r.score * 1.445} 144.5`}
                            transform="rotate(-90 28 28)"
                          />
                          <text x="28" y="32" textAnchor="middle" fill="currentColor" fontSize="14" fontWeight="bold">{r.score}</text>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">#{r.rank}</span>
                          <span className="text-sm font-bold text-gray-900 truncate">{r.company}</span>
                          <span className="text-xs text-gray-500 truncate">{r.position}</span>
                          <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            r.priority === "高" ? "bg-green-100 text-green-700" :
                            r.priority === "中" ? "bg-amber-100 text-amber-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>{r.priority}优先级</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {r.strengths.map((s) => <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700">{s}</span>)}
                          {r.weaknesses.map((w) => <span key={w} className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-500">{w}</span>)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-lg bg-brand-50">
                  <div className="text-xs font-bold text-brand-700 mb-1">投递策略</div>
                  <div className="text-xs text-brand-600">{jdCompareResult.strategy}</div>
                </div>
                <div className="text-xs text-gray-500"><strong>时间规划：</strong>{jdCompareResult.timeline}</div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
