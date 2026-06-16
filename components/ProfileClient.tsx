"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORIES, CITIES, JOB_TYPES } from "@/lib/taxonomy";
import { EMPTY_PREFS, loadPrefs, savePrefs } from "@/lib/prefs";
import { getSession, getUser, signInWithGitHub, type GhUser } from "@/lib/auth";
import { hasPrefs } from "@/lib/ranking";
import { extractPdfText, parseResumeWithAI, extractKeywordsLocal, type ParsedResume } from "@/lib/resumeParser";
import { computeProfileMatchDetailed } from "@/lib/matchScore";
import type { Category, Experience, Job, JobType, Prefs } from "@/lib/types";

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-sm transition ${active ? "bg-brand-500 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100 border border-gray-200"}`}>
      {children}
    </button>
  );
}

export default function ProfileClient({ jobs }: { jobs: Job[] }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<GhUser | null>(null);
  const [draft, setDraft] = useState<Prefs>(EMPTY_PREFS);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiResult, setAiResult] = useState<ParsedResume | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSession().then((s) => setLoggedIn(!!s));
    getUser().then(setUser);
    const p = loadPrefs();
    if (hasPrefs(p)) {
      setDraft(p);
      setStep(3);
    }
  }, []);

  async function handleFileUpload(file: File) {
    setLoading(true);
    setError("");
    try {
      const text = await extractPdfText(file);
      setResumeText(text);
      const result = await parseResumeWithAI(text);
      setAiResult(result);
      const exps = result.experiences ?? [];
      const expSkills = exps.flatMap((e) => e.skills);
      const allSkills = [...new Set([...result.skills, ...expSkills])];
      const expFlatback = exps.map((e) => `${e.company}-${e.role}-${e.description?.slice(0, 50) ?? ""}`);
      setDraft({
        ...draft,
        school: result.school ?? "",
        major: result.major ?? "",
        degree: (result.degree as Prefs["degree"]) ?? "",
        skills: allSkills,
        targetRoles: result.targetRoles,
        resumeKeywords: allSkills,
        experience: result.experience?.length ? result.experience : expFlatback,
        experiences: exps,
        strengths: result.strengths ?? [],
        weaknesses: result.weaknesses ?? [],
        summary: result.summary ?? "",
        categories: draft.categories.length > 0 ? draft.categories : [],
        cities: draft.cities.length > 0 ? draft.cities : [],
        jobTypes: draft.jobTypes.length > 0 ? draft.jobTypes : [],
      });
      setStep(2);
    } catch (e) {
      setError((e as Error).message);
      const keywords = extractKeywordsLocal(resumeText || "");
      if (keywords.length > 0) setDraft({ ...draft, skills: keywords.slice(0, 10), resumeKeywords: keywords });
    }
    setLoading(false);
  }

  async function handleTextParse() {
    if (!resumeText.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await parseResumeWithAI(resumeText);
      setAiResult(result);
      const exps = result.experiences ?? [];
      const expSkills = exps.flatMap((e) => e.skills);
      const allSkills = [...new Set([...result.skills, ...expSkills])];
      const expFlatback = exps.map((e) => `${e.company}-${e.role}-${e.description?.slice(0, 50) ?? ""}`);
      setDraft({ ...draft, school: result.school ?? "", major: result.major ?? "", degree: (result.degree as Prefs["degree"]) ?? "", skills: allSkills, targetRoles: result.targetRoles, resumeKeywords: allSkills, experience: result.experience?.length ? result.experience : expFlatback, experiences: exps, strengths: result.strengths ?? [], weaknesses: result.weaknesses ?? [], summary: result.summary ?? "" });
      setStep(2);
    } catch {
      const keywords = extractKeywordsLocal(resumeText);
      setDraft({ ...draft, skills: keywords.slice(0, 10), resumeKeywords: keywords });
      setStep(2);
    }
    setLoading(false);
  }

  function handleSave() {
    savePrefs(draft);
    setSaved(true);
    setStep(3);
  }

  const topMatches = saved || step === 3
    ? jobs.map((j) => ({ job: j, ...computeProfileMatchDetailed(j, draft) })).sort((a, b) => b.score - a.score).slice(0, 5)
    : [];

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 grid place-items-center mx-auto mb-4 shadow-lg">
            <span className="text-2xl font-bold text-white">C</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Career Search</h1>
          <p className="text-sm text-gray-500 mb-6">登录后建立你的求职画像，获取 AI 匹配推荐</p>
          <button onClick={() => signInWithGitHub()} className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 shadow-sm transition">
            GitHub 登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/60 border-b border-black/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href={basePath + "/"} className="text-[15px] font-bold text-gray-900 hover:text-brand-600 transition">← 返回首页</a>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { sessionStorage.setItem("skip-profile", "1"); window.location.href = "/"; }}
              className="text-[13px] text-gray-500 hover:text-brand-600 transition"
            >
              跳过
            </button>
            {user && (
              <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={user.avatar_url} alt="" className="w-full h-full" />
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Progress steps */}
        <div className="flex items-center gap-3 mb-8">
          {[{ n: 1, label: "上传简历" }, { n: 2, label: "完善画像" }, { n: 3, label: "查看匹配" }].map((s) => (
            <div key={s.n} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${step >= s.n ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                {step > s.n ? "✓" : s.n}
              </div>
              <span className={`text-sm ${step >= s.n ? "text-gray-900 font-medium" : "text-gray-400"}`}>{s.label}</span>
              {s.n < 3 && <div className={`flex-1 h-px ${step > s.n ? "bg-brand-500" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-sm text-red-600">{error}</div>}

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">上传简历或手动填写</h2>
              <p className="text-sm text-gray-500">AI 自动解析你的学校、技能、经历，生成求职画像</p>
            </div>

            <div
              className="card p-10 text-center cursor-pointer hover:border-brand-400 transition border-2 border-dashed"
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
              {loading ? (
                <div className="text-brand-600 font-medium">AI 解析中...</div>
              ) : (
                <>
                  <div className="text-4xl text-gray-300 mb-3">📄</div>
                  <div className="text-sm font-medium text-gray-700">点击上传简历 PDF</div>
                  <div className="text-xs text-gray-400 mt-1">DeepSeek AI 自动提取学校、技能、岗位方向</div>
                </>
              )}
            </div>

            <div className="text-center text-xs text-gray-400">— 或者 —</div>

            <div className="space-y-3">
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="粘贴简历文本..."
                rows={5}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:border-brand-500"
              />
              <div className="flex gap-2">
                <button onClick={handleTextParse} disabled={loading || !resumeText.trim()} className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition">
                  {loading ? "解析中..." : "AI 解析"}
                </button>
                <button onClick={() => setStep(2)} className="py-2.5 px-4 rounded-lg text-sm border border-gray-200 text-gray-600 hover:border-gray-400">
                  跳过，手动填写
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Edit profile */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">完善求职画像</h2>
              <p className="text-sm text-gray-500">{aiResult ? "AI 已自动填充，你可以修改调整" : "填写你的基本信息和求职意向"}</p>
            </div>

            {aiResult && (
              <div className="card p-4 bg-brand-50/50 border-brand-100">
                <div className="text-xs font-medium text-brand-700 mb-1">AI 解析结果</div>
                <div className="text-sm text-brand-600">{aiResult.summary}</div>
                {aiResult.strengths.length > 0 && <div className="text-xs text-gray-600 mt-1">优势：{aiResult.strengths.join("、")}</div>}
                {aiResult.weaknesses.length > 0 && <div className="text-xs text-gray-500 mt-0.5">待提升：{aiResult.weaknesses.join("、")}</div>}
              </div>
            )}

            <div className="card p-5 space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">学校</label>
                  <input value={draft.school ?? ""} onChange={(e) => setDraft({ ...draft, school: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">专业</label>
                  <input value={draft.major ?? ""} onChange={(e) => setDraft({ ...draft, major: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">学历</label>
                  <select value={draft.degree ?? ""} onChange={(e) => setDraft({ ...draft, degree: e.target.value as Prefs["degree"] })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-500">
                    <option value="">不限</option>
                    <option value="本科">本科</option>
                    <option value="硕士">硕士</option>
                    <option value="博士">博士</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">核心技能</label>
                <input value={(draft.skills ?? []).join(", ")} onChange={(e) => setDraft({ ...draft, skills: e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean) })} placeholder="如：Python, 数据分析, AI, 产品经理" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-500" />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">目标岗位</label>
                <input value={(draft.targetRoles ?? []).join(", ")} onChange={(e) => setDraft({ ...draft, targetRoles: e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean) })} placeholder="如：AI产品经理, 管培生" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-500" />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-2 block">意向行业</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => <Chip key={c} active={draft.categories.includes(c)} onClick={() => setDraft({ ...draft, categories: toggle<Category>(draft.categories, c) })}>{c}</Chip>)}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-2 block">岗位类型</label>
                <div className="flex flex-wrap gap-2">
                  {JOB_TYPES.map((t) => <Chip key={t} active={draft.jobTypes.includes(t)} onClick={() => setDraft({ ...draft, jobTypes: toggle<JobType>(draft.jobTypes, t) })}>{t}</Chip>)}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-2 block">意向城市</label>
                <div className="flex flex-wrap gap-2">
                  {CITIES.map((c) => <Chip key={c} active={draft.cities.includes(c)} onClick={() => setDraft({ ...draft, cities: toggle<string>(draft.cities, c) })}>{c}</Chip>)}
                </div>
              </div>
            </div>

            {/* Structured experiences */}
            {(draft.experiences ?? []).length > 0 && (
              <div className="card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-700">实习/工作经历（{draft.experiences!.length} 段）</label>
                </div>
                {draft.experiences!.map((exp, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-gray-100 relative group">
                    <button
                      onClick={() => setDraft({ ...draft, experiences: draft.experiences!.filter((_, i) => i !== idx) })}
                      className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition text-sm"
                    >✕</button>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">{exp.company}</span>
                      <span className="text-xs text-brand-600">{exp.role}</span>
                      {exp.department && <span className="text-[11px] text-gray-400">· {exp.department}</span>}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-2">
                      {exp.duration && <span>{exp.duration}</span>}
                      {exp.industry && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{exp.industry}</span>}
                    </div>
                    {exp.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {exp.skills.map((s) => <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600">{s}</span>)}
                      </div>
                    )}
                    {exp.highlights.length > 0 && (
                      <div className="text-[11px] text-gray-600">
                        {exp.highlights.map((h, hi) => <span key={hi} className="mr-2">• {h}</span>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Email notification */}
            <div className="card p-4 bg-brand-50/30 border-brand-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">每日岗位推送</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={draft.notifyEnabled ?? false} onChange={(e) => setDraft({ ...draft, notifyEnabled: e.target.checked })} className="accent-brand-500" />
                  <span className="text-xs text-gray-600">{draft.notifyEnabled ? "已开启" : "关闭"}</span>
                </label>
              </div>
              {draft.notifyEnabled && (
                <input
                  type="email"
                  value={draft.notifyEmail ?? ""}
                  onChange={(e) => setDraft({ ...draft, notifyEmail: e.target.value })}
                  placeholder="输入接收推送的邮箱"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-500"
                />
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="py-2.5 px-4 rounded-lg text-sm border border-gray-200 text-gray-600">返回上一步</button>
              <button onClick={handleSave} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 shadow-sm transition">
                保存画像，查看匹配
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">画像已建立</h2>
                <p className="text-sm text-gray-500">{draft.school} · {draft.major} · {(draft.skills ?? []).slice(0, 3).join(", ")}</p>
              </div>
              <button onClick={() => setStep(2)} className="text-sm text-brand-600 hover:text-brand-700">修改画像</button>
            </div>

            {draft.summary && (
              <div className="card p-4 bg-brand-50/50 border-brand-100">
                <div className="text-xs font-medium text-brand-700 mb-1">AI 画像摘要</div>
                <div className="text-sm text-brand-600">{draft.summary}</div>
              </div>
            )}

            {((draft.strengths ?? []).length > 0 || (draft.weaknesses ?? []).length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(draft.strengths ?? []).length > 0 && (
                  <div className="card p-4">
                    <div className="text-xs font-medium text-green-700 mb-2">核心优势</div>
                    <div className="flex flex-wrap gap-1.5">
                      {draft.strengths!.map((s) => <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-700">{s}</span>)}
                    </div>
                  </div>
                )}
                {(draft.weaknesses ?? []).length > 0 && (
                  <div className="card p-4">
                    <div className="text-xs font-medium text-amber-700 mb-2">待提升</div>
                    <div className="flex flex-wrap gap-1.5">
                      {draft.weaknesses!.map((s) => <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{s}</span>)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {(draft.experiences ?? []).length > 0 && (
              <div className="card p-4">
                <div className="text-xs font-medium text-gray-700 mb-3">实习/工作经历（{draft.experiences!.length} 段）</div>
                <div className="space-y-2.5">
                  {draft.experiences!.map((exp, i) => (
                    <div key={i} className="p-3 rounded-lg bg-gray-50/80 border border-gray-100">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">{exp.company}</span>
                        <span className="text-xs text-brand-600">{exp.role}</span>
                        {exp.department && <span className="text-[11px] text-gray-400">· {exp.department}</span>}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-1.5">
                        {exp.duration && <span>{exp.duration}</span>}
                        {exp.industry && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{exp.industry}</span>}
                      </div>
                      {exp.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {exp.skills.map((s) => <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600">{s}</span>)}
                        </div>
                      )}
                      {exp.highlights.length > 0 && (
                        <div className="text-[11px] text-gray-600">
                          {exp.highlights.map((h, hi) => <span key={hi} className="mr-2">• {h}</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick match preview */}
            {topMatches.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Top 5 匹配岗位</h3>
                <div className="space-y-3">
                  {topMatches.map((m, i) => (
                    <a key={m.job.id} href={m.job.applyUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
                      <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${i < 3 ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-500"}`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{m.job.company} · {m.job.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{m.reasons.slice(0, 2).join(" · ")}</div>
                      </div>
                      <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${m.score > 0.6 ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-600"}`}>
                        {Math.round(m.score * 100)}%
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <a href={basePath + "/"} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-center border border-gray-200 text-gray-700 hover:border-gray-400 transition">
                浏览全部岗位
              </a>
              <a href={basePath + "/report/"} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-center text-white bg-brand-500 hover:bg-brand-600 shadow-sm transition">
                查看求职报告
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
