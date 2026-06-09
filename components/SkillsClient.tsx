"use client";

import { useEffect, useState } from "react";
import { loadPrefs } from "@/lib/prefs";
import { hasPrefs } from "@/lib/ranking";
import { getSession } from "@/lib/auth";
import { generateInterview, polishResume, generateCoverLetter, compareOffers } from "@/lib/skills";
import type { InterviewQuestion, ResumePolishResult, CoverLetterResult, OfferCompareResult } from "@/lib/skills";
import type { Job, Prefs } from "@/lib/types";

type Skill = "interview" | "resume" | "cover-letter" | "offer";

const SKILLS: { key: Skill; label: string; desc: string; icon: string }[] = [
  { key: "interview", label: "面试题定制", desc: "根据你的背景和目标岗位，AI 生成针对性面试题+参考答案", icon: "🎯" },
  { key: "resume", label: "简历润色", desc: "逐条分析你的经历，给出具体优化建议和评分", icon: "📝" },
  { key: "cover-letter", label: "求职信生成", desc: "根据目标岗位 JD，生成定制化求职信", icon: "✉️" },
  { key: "offer", label: "Offer 对比", desc: "多个 Offer 横向对比，综合分析给出推荐", icon: "⚖️" },
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
  const [interviewResult, setInterviewResult] = useState<InterviewQuestion[] | null>(null);
  const [resumeResult, setResumeResult] = useState<ResumePolishResult | null>(null);
  const [letterResult, setLetterResult] = useState<CoverLetterResult | null>(null);
  const [offerResult, setOfferResult] = useState<OfferCompareResult | null>(null);

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
                  onClick={() => { setActive(s.key); setInterviewResult(null); setResumeResult(null); setLetterResult(null); setOfferResult(null); setError(""); }}
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

                {(active === "interview" || active === "resume" || active === "cover-letter") && (
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

                {active === "resume" && (
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
          </>
        )}
      </main>
    </div>
  );
}
