"use client";

import { useRef, useState } from "react";
import { CATEGORIES, CITIES, JOB_TYPES } from "@/lib/taxonomy";
import { EMPTY_PREFS } from "@/lib/prefs";
import { extractPdfText, parseResumeWithAI, extractKeywordsLocal, type ParsedResume } from "@/lib/resumeParser";
import type { Category, JobType, Prefs } from "@/lib/types";

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 h-[30px] inline-flex items-center rounded-full text-[13px] font-medium transition ${
        active
          ? "bg-brand-500 text-white shadow-[var(--shadow-sm)] shadow-brand-500/20"
          : "border border-[var(--border)] text-[var(--text-s)] hover:text-brand-500 hover:bg-brand-50/80"
      }`}
    >
      {children}
    </button>
  );
}

type Tab = "manual" | "upload" | "paste";

export default function PrefsPanel({
  open,
  prefs,
  onSave,
  onClose,
}: {
  open: boolean;
  prefs: Prefs;
  onSave: (p: Prefs) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Prefs>(prefs);
  const [tab, setTab] = useState<Tab>("manual");
  const [resumeText, setResumeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiResult, setAiResult] = useState<ParsedResume | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  async function handleFileUpload(file: File) {
    setLoading(true);
    setError("");
    try {
      const text = await extractPdfText(file);
      setResumeText(text);
      await handleAIParse(text);
    } catch (e) {
      setError(`PDF 读取失败: ${(e as Error).message}`);
      setLoading(false);
    }
  }

  async function handleAIParse(text: string) {
    setLoading(true);
    setError("");
    try {
      const result = await parseResumeWithAI(text);
      setAiResult(result);
      setDraft({
        ...draft,
        school: result.school ?? draft.school,
        major: result.major ?? draft.major,
        degree: (result.degree as Prefs["degree"]) ?? draft.degree,
        skills: result.skills.length > 0 ? result.skills : draft.skills,
        targetRoles: result.targetRoles.length > 0 ? result.targetRoles : draft.targetRoles,
        resumeKeywords: [...new Set([...(draft.resumeKeywords ?? []), ...result.skills])],
      });
    } catch (e) {
      setError(`AI 解析失败: ${(e as Error).message}。已用规则提取关键词。`);
      const keywords = extractKeywordsLocal(text);
      setDraft({ ...draft, resumeKeywords: keywords, skills: keywords.slice(0, 10) });
    }
    setLoading(false);
  }

  function handleLocalExtract() {
    if (!resumeText.trim()) return;
    const keywords = extractKeywordsLocal(resumeText);
    setDraft({ ...draft, resumeKeywords: keywords, skills: keywords.slice(0, 10) });
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "manual", label: "手动填写" },
    { key: "upload", label: "上传简历" },
    { key: "paste", label: "粘贴文本" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-[var(--surface-solid)] w-full sm:max-w-lg rounded-t-[var(--radius)] sm:rounded-[var(--radius-sm)] p-5 max-h-[88vh] overflow-y-auto border border-[var(--border)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[var(--text)]">求职画像</h3>
          <button onClick={onClose} className="text-[var(--text-t)] hover:text-[var(--text)] text-lg leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 p-0.5 bg-[rgba(0,0,0,0.04)] rounded-[var(--radius-xs)] mb-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${tab === t.key ? "bg-[var(--surface-solid)] text-[var(--text)] shadow-[var(--shadow-sm)]" : "text-[var(--text-s)]"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-[var(--radius-xs)] bg-red-50 text-xs text-red-600">{error}</div>
        )}

        {/* Tab: Manual */}
        {tab === "manual" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-[var(--text-s)] mb-1 block">学校</label>
                <input value={draft.school ?? ""} onChange={(e) => setDraft({ ...draft, school: e.target.value })} placeholder="如：北大" className="w-full px-2.5 py-1.5 rounded-md border border-[var(--border-s)] text-xs focus:outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="text-[11px] text-[var(--text-s)] mb-1 block">专业</label>
                <input value={draft.major ?? ""} onChange={(e) => setDraft({ ...draft, major: e.target.value })} placeholder="如：计算机" className="w-full px-2.5 py-1.5 rounded-md border border-[var(--border-s)] text-xs focus:outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="text-[11px] text-[var(--text-s)] mb-1 block">学历</label>
                <select value={draft.degree ?? ""} onChange={(e) => setDraft({ ...draft, degree: e.target.value as Prefs["degree"] })} className="w-full px-2.5 py-1.5 rounded-md border border-[var(--border-s)] text-xs focus:outline-none focus:border-brand-500">
                  <option value="">不限</option>
                  <option value="本科">本科</option>
                  <option value="硕士">硕士</option>
                  <option value="博士">博士</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] text-[var(--text-s)] mb-1 block">核心技能（逗号分隔）</label>
              <input value={(draft.skills ?? []).join(", ")} onChange={(e) => setDraft({ ...draft, skills: e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean) })} placeholder="如：Python, 数据分析, AI, 产品经理" className="w-full px-2.5 py-1.5 rounded-md border border-[var(--border-s)] text-xs focus:outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="text-[11px] text-[var(--text-s)] mb-1 block">目标岗位（逗号分隔）</label>
              <input value={(draft.targetRoles ?? []).join(", ")} onChange={(e) => setDraft({ ...draft, targetRoles: e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean) })} placeholder="如：AI产品经理, 管培生, 数据分析师" className="w-full px-2.5 py-1.5 rounded-md border border-[var(--border-s)] text-xs focus:outline-none focus:border-brand-500" />
            </div>
            <div>
              <div className="text-[11px] text-[var(--text-s)] mb-1.5">意向行业</div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => <Chip key={c} active={draft.categories.includes(c)} onClick={() => setDraft({ ...draft, categories: toggle<Category>(draft.categories, c) })}>{c}</Chip>)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--text-s)] mb-1.5">岗位类型</div>
              <div className="flex flex-wrap gap-1.5">
                {JOB_TYPES.map((t) => <Chip key={t} active={draft.jobTypes.includes(t)} onClick={() => setDraft({ ...draft, jobTypes: toggle<JobType>(draft.jobTypes, t) })}>{t}</Chip>)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--text-s)] mb-1.5">意向城市</div>
              <div className="flex flex-wrap gap-1.5">
                {CITIES.map((c) => <Chip key={c} active={draft.cities.includes(c)} onClick={() => setDraft({ ...draft, cities: toggle<string>(draft.cities, c) })}>{c}</Chip>)}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Upload PDF */}
        {tab === "upload" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-[var(--border-s)] rounded-[var(--radius-xs)] p-8 text-center cursor-pointer hover:border-brand-400 transition"
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
              />
              {loading ? (
                <div className="text-sm text-brand-500">解析中...</div>
              ) : (
                <>
                  <div className="text-2xl text-[var(--text-t)] mb-2">PDF</div>
                  <div className="text-sm text-[var(--text-s)]">点击上传简历 PDF</div>
                  <div className="text-[11px] text-[var(--text-t)] mt-1">AI 自动解析学校/技能/岗位方向</div>
                </>
              )}
            </div>

            {aiResult && (
              <div className="space-y-2 p-3 bg-[var(--surface)] rounded-[var(--radius-xs)]">
                <div className="text-xs font-semibold text-[var(--text)]">AI 解析结果</div>
                {aiResult.school && <div className="text-[11px] text-[var(--text-s)]">学校：{aiResult.school} · {aiResult.major} · {aiResult.degree}</div>}
                {aiResult.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {aiResult.skills.map((s) => <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-500">{s}</span>)}
                  </div>
                )}
                {aiResult.targetRoles.length > 0 && (
                  <div className="text-[11px] text-[var(--text-s)]">推荐方向：{aiResult.targetRoles.join("、")}</div>
                )}
                {aiResult.strengths.length > 0 && (
                  <div className="text-[11px] text-[var(--text-s)]">优势：{aiResult.strengths.join("、")}</div>
                )}
                {aiResult.weaknesses.length > 0 && (
                  <div className="text-[11px] text-[var(--text-s)]">待提升：{aiResult.weaknesses.join("、")}</div>
                )}
                <div className="text-[11px] text-brand-500 font-medium">{aiResult.summary}</div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Paste text */}
        {tab === "paste" && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-s)]">粘贴简历文本，可选 AI 解析或本地关键词提取。</p>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="粘贴简历文本..."
              rows={8}
              className="w-full px-3 py-2 rounded-[var(--radius-xs)] border border-[var(--border-s)] text-xs leading-relaxed resize-none focus:outline-none focus:border-brand-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleAIParse(resumeText)}
                disabled={loading || !resumeText.trim()}
                className="flex-1 py-2 rounded-[var(--radius-xs)] text-xs font-medium bg-brand-500 text-white hover:bg-brand-500 disabled:opacity-50 transition"
              >
                {loading ? "解析中..." : "AI 智能解析"}
              </button>
              <button
                onClick={handleLocalExtract}
                disabled={!resumeText.trim()}
                className="py-2 px-4 rounded-[var(--radius-xs)] text-xs border border-[var(--border-s)] text-[var(--text-s)] hover:border-[var(--border-s)] disabled:opacity-50"
              >
                本地提取
              </button>
            </div>
            {(draft.resumeKeywords ?? []).length > 0 && (
              <div>
                <div className="text-[11px] text-[var(--text-s)] mb-1.5">已提取 {draft.resumeKeywords!.length} 个关键词：</div>
                <div className="flex flex-wrap gap-1">
                  {draft.resumeKeywords!.map((k) => <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-500">{k}</span>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-5 pt-4 border-t border-[var(--border)]">
          <button
            onClick={() => { setDraft(EMPTY_PREFS); setResumeText(""); setAiResult(null); setError(""); }}
            className="px-4 py-2.5 rounded-[var(--radius-xs)] text-sm border border-[var(--border-s)] text-[var(--text-s)] hover:border-[var(--border-s)]"
          >
            清空
          </button>
          <button
            onClick={() => { onSave(draft); onClose(); }}
            className="flex-1 px-4 py-2.5 rounded-[var(--radius-xs)] text-sm font-semibold text-white bg-brand-500 hover:bg-brand-500 shadow-[var(--shadow-sm)] transition"
          >
            保存画像
          </button>
        </div>
      </div>
    </div>
  );
}
