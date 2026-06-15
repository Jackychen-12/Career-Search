"use client";

import { useEffect, useState } from "react";
import { loadPrefs } from "@/lib/prefs";
import { hasPrefs } from "@/lib/ranking";
import { getSession } from "@/lib/auth";
import { generateInterview, polishResume, generateCoverLetter, compareOffers, analyzeJdMatch, generateCustomResume, compareJds, getDirectionTemplate } from "@/lib/skills";
import type { InterviewQuestion, ResumePolishResult, CoverLetterResult, OfferCompareResult, JdMatchResult, CustomResumeResult, JdCompareResult, DirectionTemplateResult } from "@/lib/skills";
import type { Job, Prefs } from "@/lib/types";

type Skill = "interview" | "resume" | "cover-letter" | "offer" | "jd-match" | "custom-resume" | "jd-compare" | "direction";

const SKILLS: { key: Skill; label: string; desc: string; icon: string }[] = [
  { key: "interview", label: "面试题定制", desc: "根据你的背景和目标岗位，AI 生成针对性面试题+参考答案", icon: "🎯" },
  { key: "resume", label: "简历润色", desc: "逐条分析你的经历，给出具体优化建议和评分", icon: "📝" },
  { key: "cover-letter", label: "求职信生成", desc: "根据目标岗位 JD，生成定制化求职信", icon: "✉️" },
  { key: "offer", label: "Offer 对比", desc: "多个 Offer 横向对比，综合分析给出推荐", icon: "⚖️" },
  { key: "jd-match", label: "JD 匹配分析", desc: "深度分析简历与 JD 匹配度，关键词高亮+差距分析", icon: "🔍" },
  { key: "custom-resume", label: "一键定制简历", desc: "基于目标 JD 自动生成针对性简历，关键词全覆盖", icon: "🪄" },
  { key: "jd-compare", label: "多 JD 对比", desc: "批量对比多个岗位匹配度，智能排序投递优先级", icon: "📊" },
  { key: "direction", label: "方向模版", desc: "按求职方向生成简历模版、技能清单和策略建议", icon: "🧭" },
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
  if (p.experience?.length) parts.push(`经历:\n${p.experience.join("\n")}`);
  return parts.join("\n");
}

export default function SkillsClient({ jobs }: { jobs: Job[] }) {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [active, setActive] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Skill-specific state
  const [jobInput, setJobInput] = useState("");
  const [expInput, setExpInput] = useState("");
  const [offersInput, setOffersInput] = useState("");
  const [jdsInput, setJdsInput] = useState("");
  const [directionInput, setDirectionInput] = useState("");
  const [interviewResult, setInterviewResult] = useState<InterviewQuestion[] | null>(null);
  const [resumeResult, setResumeResult] = useState<ResumePolishResult | null>(null);
  const [letterResult, setLetterResult] = useState<CoverLetterResult | null>(null);
  const [offerResult, setOfferResult] = useState<OfferCompareResult | null>(null);
  const [jdMatchResult, setJdMatchResult] = useState<JdMatchResult | null>(null);
  const [customResumeResult, setCustomResumeResult] = useState<CustomResumeResult | null>(null);
  const [jdCompareResult, setJdCompareResult] = useState<JdCompareResult | null>(null);
  const [directionResult, setDirectionResult] = useState<DirectionTemplateResult | null>(null);

  useEffect(() => {
    const p = loadPrefs();
    if (hasPrefs(p)) setPrefs(p);
    getSession().then((s) => setLoggedIn(!!s));
  }, []);

  async function run() {
    if (!prefs || !active) return;
    setLoading(true);
    setError("");
    const profile = profileToText(prefs);
    try {
      if (active === "interview") {
        const r = await generateInterview(profile, jobInput);
        setInterviewResult(r.questions);
      } else if (active === "resume") {
        const r = await polishResume(profile, jobInput, expInput);
        setResumeResult(r);
      } else if (active === "cover-letter") {
        const r = await generateCoverLetter(profile, jobInput);
        setLetterResult(r);
      } else if (active === "offer") {
        const r = await compareOffers(profile, offersInput);
        setOfferResult(r);
      } else if (active === "jd-match") {
        const r = await analyzeJdMatch(profile, jobInput);
        setJdMatchResult(r);
      } else if (active === "custom-resume") {
        const r = await generateCustomResume(profile, jobInput, expInput);
        setCustomResumeResult(r);
      } else if (active === "jd-compare") {
        const r = await compareJds(profile, jdsInput);
        setJdCompareResult(r);
      } else if (active === "direction") {
        const r = await getDirectionTemplate(profile, directionInput);
        setDirectionResult(r);
      }
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }

  // Quick fill from job list
  const topJobs = jobs.slice(0, 20);

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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SKILLS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => {
                    setActive(s.key);
                    setInterviewResult(null); setResumeResult(null); setLetterResult(null); setOfferResult(null); setJdMatchResult(null); setCustomResumeResult(null); setJdCompareResult(null); setDirectionResult(null); setError("");
                    if ((s.key === "resume" || s.key === "custom-resume") && !expInput && prefs?.experience?.length) {
                      setExpInput(prefs.experience.join("\n"));
                    }
                    if (s.key === "direction" && !directionInput && prefs?.targetRoles?.length) {
                      setDirectionInput(prefs.targetRoles[0]);
                    }
                    if (["interview", "resume", "cover-letter", "jd-match", "custom-resume"].includes(s.key) && !jobInput && prefs?.targetRoles?.length) {
                      setJobInput(prefs.targetRoles.join("、"));
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

            {/* Input area */}
            {active && (
              <div className="card p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-900">{SKILLS.find((s) => s.key === active)?.label}</h3>

                {/* Auto-detected profile banner */}
                <div className="p-3 rounded-lg bg-brand-50/60 border border-brand-100 flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold">AI</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-brand-700 mb-1">已自动加载你的画像</div>
                    <div className="text-[11px] text-brand-600 truncate">
                      {[prefs?.school, prefs?.major, prefs?.degree].filter(Boolean).join(" · ")}
                      {(prefs?.skills?.length ?? 0) > 0 && ` · ${prefs!.skills!.slice(0, 3).join(", ")}${prefs!.skills!.length > 3 ? "..." : ""}`}
                    </div>
                    {(prefs?.experience?.length ?? 0) > 0 && (
                      <div className="text-[11px] text-brand-500 mt-0.5">{prefs!.experience!.length} 段经历已就绪</div>
                    )}
                  </div>
                  <a href="/profile/" className="shrink-0 text-[11px] text-brand-600 hover:text-brand-700 underline">修改</a>
                </div>

                {(active === "interview" || active === "resume" || active === "cover-letter" || active === "jd-match" || active === "custom-resume") && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">目标岗位（粘贴 JD 或输入公司+岗位名）</label>
                    <textarea
                      value={jobInput}
                      onChange={(e) => setJobInput(e.target.value)}
                      placeholder="如：字节跳动 AI产品经理，或粘贴完整 JD..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:border-brand-500"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[10px] text-gray-400">快速填入：</span>
                      {topJobs.slice(0, 6).map((j) => (
                        <button key={j.id} onClick={() => setJobInput(`${j.company} - ${j.title}\n${j.description ?? ""}\n技能要求: ${j.aiTags?.skills.join(", ") ?? ""}`)}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-600 transition">
                          {j.company}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(active === "resume" || active === "custom-resume") && (
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
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">待对比的岗位 JD（每个 JD 用 --- 分隔）</label>
                    <textarea
                      value={jdsInput}
                      onChange={(e) => setJdsInput(e.target.value)}
                      placeholder="字节跳动 AI产品经理\n岗位职责：...\n任职要求：...\n---\n腾讯 数据产品经理\n岗位职责：...\n任职要求：..."
                      rows={8}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:border-brand-500"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[10px] text-gray-400">快速添加：</span>
                      {topJobs.slice(0, 8).map((j) => (
                        <button key={j.id} onClick={() => setJdsInput((prev) => (prev ? prev + "\n---\n" : "") + `${j.company} - ${j.title}\n${j.description ?? ""}\n技能要求: ${j.aiTags?.skills.join(", ") ?? ""}`)}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-600 transition">
                          + {j.company}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {active === "direction" && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">目标求职方向</label>
                    <input
                      value={directionInput}
                      onChange={(e) => setDirectionInput(e.target.value)}
                      placeholder="如：AI产品经理、数据分析师、量化交易..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[10px] text-gray-400">热门方向：</span>
                      {["产品经理", "数据分析", "后端开发", "前端开发", "AI/算法", "运营", "咨询", "投行/金融"].map((d) => (
                        <button key={d} onClick={() => setDirectionInput(d)}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-600 transition">
                          {d}
                        </button>
                      ))}
                    </div>
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

            {/* Results */}
            {interviewResult && (
              <div className="card p-5 space-y-3">
                <h3 className="text-sm font-bold text-gray-900">面试题（{interviewResult.length} 道）</h3>
                {interviewResult.map((q, i) => (
                  <div key={i} className="p-3 rounded-lg border border-gray-100">
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-brand-50 text-brand-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{q.question}</div>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{q.category}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{q.difficulty}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-2"><strong>回答要点：</strong>{q.tips}</div>
                        <div className="text-xs text-gray-400 mt-1"><strong>参考答案：</strong>{q.sample}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {resumeResult && (
              <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">简历评估</h3>
                  <span className={`text-lg font-bold ${resumeResult.score >= 80 ? "text-brand-600" : resumeResult.score >= 60 ? "text-amber-600" : "text-red-600"}`}>
                    {resumeResult.score}分
                  </span>
                </div>
                <p className="text-xs text-gray-500">{resumeResult.scoreReason}</p>
                <div className="flex flex-wrap gap-1.5">
                  {resumeResult.keywords.map((k) => <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-600">{k}</span>)}
                </div>
                {resumeResult.suggestions.map((s, i) => (
                  <div key={i} className="p-3 rounded-lg bg-gray-50 space-y-1">
                    <div className="text-xs text-gray-400 line-through">{s.original}</div>
                    <div className="text-xs text-gray-900 font-medium">{s.improved}</div>
                    <div className="text-[11px] text-brand-600">{s.reason}</div>
                  </div>
                ))}
                <p className="text-xs text-gray-600"><strong>整体建议：</strong>{resumeResult.overall}</p>
              </div>
            )}

            {letterResult && (
              <div className="card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">求职信</h3>
                  <button onClick={() => navigator.clipboard.writeText(letterResult.letter).then(() => alert("已复制"))} className="text-xs text-brand-600">复制</button>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 text-sm text-gray-700 whitespace-pre-line leading-relaxed">{letterResult.letter}</div>
                <div className="flex flex-wrap gap-1.5">
                  {letterResult.highlights.map((h) => <span key={h} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-600">{h}</span>)}
                </div>
                <p className="text-xs text-gray-500">{letterResult.tips}</p>
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
                  {/* 圆环分数 */}
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

                {/* JD 关键词 */}
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

                {/* 建议 */}
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

            {/* ── 一键定制简历结果 ── */}
            {customResumeResult && (
              <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">定制简历</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-400">关键词覆盖</span>
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${customResumeResult.keywordCoverage}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-brand-600">{customResumeResult.keywordCoverage}%</span>
                    </div>
                    <button
                      onClick={() => {
                        const text = customResumeResult.sections.map((s) => `【${s.title}】\n${s.content}`).join("\n\n");
                        navigator.clipboard.writeText(text).then(() => alert("已复制到剪贴板"));
                      }}
                      className="text-xs text-brand-600 font-medium hover:text-brand-700"
                    >
                      一键复制
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {customResumeResult.highlights.map((h) => <span key={h} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-600">{h}</span>)}
                </div>

                {/* 简历预览 */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {customResumeResult.sections.map((s, i) => (
                    <div key={i} className={`px-5 py-3 ${i > 0 ? "border-t border-gray-100" : ""}`}>
                      <div className="text-xs font-bold text-gray-800 mb-1.5">{s.title}</div>
                      <div className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">{s.content}</div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-500"><strong>投递建议：</strong>{customResumeResult.tips}</p>
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

            {/* Direction Template Result */}
            {directionResult && active === "direction" && (
              <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{directionResult.direction}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{directionResult.overview}</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gray-50 space-y-3">
                  <div className="text-xs font-bold text-gray-700">求职意向模版</div>
                  <div className="text-sm text-gray-800">{directionResult.template.objective}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-green-50">
                    <div className="text-xs font-bold text-green-700 mb-2">必备技能</div>
                    <div className="flex flex-wrap gap-1.5">
                      {directionResult.template.skillsRequired.map((s) => (
                        <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50">
                    <div className="text-xs font-bold text-blue-700 mb-2">加分技能</div>
                    <div className="flex flex-wrap gap-1.5">
                      {directionResult.template.skillsBonus.map((s) => (
                        <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-gray-700">经历模版（STAR 法则）</div>
                  {directionResult.template.experienceTemplate.map((exp) => (
                    <div key={exp.type} className="p-3 rounded-lg border border-gray-100">
                      <div className="text-[11px] font-semibold text-brand-600 mb-1">{exp.type}</div>
                      <div className="text-xs text-gray-600 whitespace-pre-wrap">{exp.example}</div>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-lg bg-gray-50">
                  <div className="text-xs font-bold text-gray-700 mb-1">学历 / 证书重点</div>
                  <div className="text-xs text-gray-600">{directionResult.template.educationFocus}</div>
                </div>

                <div className="p-3 rounded-lg bg-brand-50">
                  <div className="text-xs font-bold text-brand-700 mb-1">自我评价模版</div>
                  <div className="text-xs text-brand-600">{directionResult.template.selfIntro}</div>
                </div>

                <div>
                  <div className="text-xs font-bold text-gray-700 mb-2">关键量化指标</div>
                  <div className="flex flex-wrap gap-1.5">
                    {directionResult.keyMetrics.map((m) => (
                      <span key={m} className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{m}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-red-600 mb-2">常见错误</div>
                  <ul className="space-y-1">
                    {directionResult.commonMistakes.map((m) => (
                      <li key={m} className="text-xs text-red-500 flex items-start gap-1.5">
                        <span className="mt-0.5 shrink-0">⚠</span><span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-xs font-bold text-gray-700 mb-2">面试重点考察</div>
                  <div className="flex flex-wrap gap-1.5">
                    {directionResult.interviewFocus.map((f) => (
                      <span key={f} className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{f}</span>
                    ))}
                  </div>
                </div>

                {directionResult.relatedDirections.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-gray-700 mb-2">相近方向</div>
                    <div className="flex flex-wrap gap-1.5">
                      {directionResult.relatedDirections.map((d) => (
                        <button key={d} onClick={() => setDirectionInput(d)}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-600 transition cursor-pointer">
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
