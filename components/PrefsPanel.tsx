"use client";

import { useState } from "react";
import { CATEGORIES, CITIES, JOB_TYPES } from "@/lib/taxonomy";
import { EMPTY_PREFS } from "@/lib/prefs";
import type { Category, JobType, Prefs } from "@/lib/types";

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded text-xs font-medium transition ${
        active
          ? "bg-nav text-white shadow-sm"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function extractKeywords(text: string): string[] {
  const keywords = new Set<string>();
  const patterns = [
    /(?:熟悉|精通|掌握|了解|擅长|使用|具备)[：:]?\s*([^。，；\n]+)/g,
    /(?:技能|技术|工具|语言)[：:]?\s*([^。\n]+)/g,
  ];
  for (const p of patterns) {
    let m;
    while ((m = p.exec(text)) !== null) {
      m[1].split(/[,，、/|;；\s]+/).forEach((w) => {
        const t = w.trim();
        if (t.length >= 2 && t.length <= 10) keywords.add(t);
      });
    }
  }
  const commonSkills = [
    "Python", "Java", "JavaScript", "TypeScript", "Go", "C++", "SQL", "R",
    "机器学习", "深度学习", "NLP", "CV", "大模型", "LLM", "AI", "AIGC",
    "数据分析", "数据挖掘", "数据可视化", "Tableau", "PowerBI",
    "产品经理", "产品设计", "用户研究", "需求分析", "PRD",
    "项目管理", "敏捷", "Scrum",
    "金融", "投行", "风控", "量化", "CFA", "FRM",
    "运营", "增长", "内容", "社群",
    "React", "Vue", "Node", "Docker", "Kubernetes", "AWS",
    "Excel", "PPT", "Figma", "Sketch",
  ];
  for (const skill of commonSkills) {
    if (text.includes(skill)) keywords.add(skill);
  }
  return [...keywords].slice(0, 30);
}

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
  const [resumeText, setResumeText] = useState("");
  const [tab, setTab] = useState<"profile" | "resume">("profile");
  if (!open) return null;

  function handleExtract() {
    if (!resumeText.trim()) return;
    const extracted = extractKeywords(resumeText);
    setDraft({ ...draft, resumeKeywords: extracted });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-xl p-5 max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">求职画像</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 p-0.5 bg-slate-100 rounded-md mb-4">
          <button
            onClick={() => setTab("profile")}
            className={`flex-1 py-1.5 rounded text-xs font-medium transition ${tab === "profile" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            手动填写
          </button>
          <button
            onClick={() => setTab("resume")}
            className={`flex-1 py-1.5 rounded text-xs font-medium transition ${tab === "resume" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            简历提取
          </button>
        </div>

        {tab === "profile" ? (
          <div className="space-y-4">
            {/* Basic info */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-slate-500 mb-1 block">学校</label>
                <input
                  value={draft.school ?? ""}
                  onChange={(e) => setDraft({ ...draft, school: e.target.value })}
                  placeholder="如：北大"
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 mb-1 block">专业</label>
                <input
                  value={draft.major ?? ""}
                  onChange={(e) => setDraft({ ...draft, major: e.target.value })}
                  placeholder="如：计算机"
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 mb-1 block">学历</label>
                <select
                  value={draft.degree ?? ""}
                  onChange={(e) => setDraft({ ...draft, degree: e.target.value as Prefs["degree"] })}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value="">不限</option>
                  <option value="本科">本科</option>
                  <option value="硕士">硕士</option>
                  <option value="博士">博士</option>
                </select>
              </div>
            </div>

            {/* Skills */}
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">核心技能（逗号分隔）</label>
              <input
                value={(draft.skills ?? []).join(", ")}
                onChange={(e) => setDraft({ ...draft, skills: e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean) })}
                placeholder="如：Python, 数据分析, AI, 产品经理"
                className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Target roles */}
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">目标岗位（逗号分隔）</label>
              <input
                value={(draft.targetRoles ?? []).join(", ")}
                onChange={(e) => setDraft({ ...draft, targetRoles: e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean) })}
                placeholder="如：AI产品经理, 管培生, 数据分析师"
                className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Categories */}
            <div>
              <div className="text-[11px] text-slate-500 mb-1.5">意向行业</div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <Chip key={c} active={draft.categories.includes(c)} onClick={() => setDraft({ ...draft, categories: toggle<Category>(draft.categories, c) })}>
                    {c}
                  </Chip>
                ))}
              </div>
            </div>

            {/* Job types */}
            <div>
              <div className="text-[11px] text-slate-500 mb-1.5">岗位类型</div>
              <div className="flex flex-wrap gap-1.5">
                {JOB_TYPES.map((t) => (
                  <Chip key={t} active={draft.jobTypes.includes(t)} onClick={() => setDraft({ ...draft, jobTypes: toggle<JobType>(draft.jobTypes, t) })}>
                    {t}
                  </Chip>
                ))}
              </div>
            </div>

            {/* Cities */}
            <div>
              <div className="text-[11px] text-slate-500 mb-1.5">意向城市</div>
              <div className="flex flex-wrap gap-1.5">
                {CITIES.map((c) => (
                  <Chip key={c} active={draft.cities.includes(c)} onClick={() => setDraft({ ...draft, cities: toggle<string>(draft.cities, c) })}>
                    {c}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">粘贴简历全文（或核心段落），自动提取技能关键词用于 AI 匹配。</p>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="粘贴简历文本..."
              rows={8}
              className="w-full px-3 py-2 rounded-md border border-slate-200 text-xs leading-relaxed resize-none focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleExtract}
              className="w-full py-2 rounded-md text-xs font-medium bg-nav text-white hover:bg-slate-800 transition"
            >
              提取关键词
            </button>
            {(draft.resumeKeywords ?? []).length > 0 && (
              <div>
                <div className="text-[11px] text-slate-500 mb-1.5">已提取 {draft.resumeKeywords!.length} 个关键词：</div>
                <div className="flex flex-wrap gap-1">
                  {draft.resumeKeywords!.map((k) => (
                    <span key={k} className="text-[10px] px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-100">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-5 pt-4 border-t border-slate-100">
          <button
            onClick={() => { setDraft(EMPTY_PREFS); setResumeText(""); }}
            className="px-4 py-2 rounded-md text-xs border border-slate-200 text-slate-600 hover:border-slate-300"
          >
            清空
          </button>
          <button
            onClick={() => { onSave(draft); onClose(); }}
            className="flex-1 px-4 py-2 rounded-md text-xs font-semibold text-white bg-nav hover:bg-slate-800 transition"
          >
            保存画像
          </button>
        </div>
      </div>
    </div>
  );
}
