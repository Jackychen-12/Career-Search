"use client";

import { useEffect, useMemo, useState } from "react";
import { loadPrefs } from "@/lib/prefs";
import { hasPrefs } from "@/lib/ranking";
import { getSession } from "@/lib/auth";
import { generateInterview, followupInterview, generateCoverLetter, refineCoverLetter, compareOffers, analyzeJdMatch, compareJds, optimizeResume, refineResume } from "@/lib/skills";
import type { InterviewQuestion, CoverLetterResult, OfferCompareResult, JdMatchResult, JdCompareResult, ResumeOptimizeResult } from "@/lib/skills";
import type { Job, Prefs } from "@/lib/types";
import { extractPdfText, parseResumeWithAI } from "@/lib/resumeParser";

type Skill = "interview" | "resume-optimize" | "cover-letter" | "offer" | "jd-match" | "jd-compare";

const SKILLS: { key: Skill; label: string; desc: string; icon: string }[] = [
  { key: "interview", label: "面试题定制", desc: "根据你的背景和目标岗位，AI 生成针对性面试题+参考答案", icon: "🎯" },
  { key: "resume-optimize", label: "简历优化", desc: "AI 逐句分析简历，优先级改写建议 + 导出定制简历", icon: "📝" },
  { key: "cover-letter", label: "求职信生成", desc: "根据目标岗位 JD，生成定制化求职信", icon: "✉️" },
  { key: "offer", label: "Offer 对比", desc: "多个 Offer 横向对比，综合分析给出推荐", icon: "⚖️" },
  { key: "jd-match", label: "JD 匹配分析", desc: "深度分析简历与 JD 匹配度，关键词高亮+差距分析", icon: "🔍" },
  { key: "jd-compare", label: "多 JD 对比", desc: "批量对比多个岗位匹配度，智能排序投递优先级", icon: "📊" },
];

function profileToText(p: Prefs | null): string {
  if (!p) return "未设置画像";
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

function buildSectionsFromPrefs(p: Prefs): { title: string; content: string }[] {
  const sections: { title: string; content: string }[] = [];
  if (p.targetRoles?.length) sections.push({ title: "求职意向", content: p.targetRoles.join(" / ") });
  if (p.school || p.major || p.degree) sections.push({ title: "教育背景", content: [p.school, p.major, p.degree].filter(Boolean).join(" · ") });
  if (p.skills?.length) sections.push({ title: "核心技能", content: p.skills.join(" / ") });
  if (p.experiences?.length) {
    const text = p.experiences.map((e) => {
      const header = [e.company, e.role, e.department].filter(Boolean).join(" · ");
      const lines = [header];
      if (e.duration) lines.push(e.duration);
      if (e.highlights.length) lines.push(...e.highlights.map((h) => `- ${h}`));
      if (e.description) lines.push(e.description);
      return lines.join("\n");
    }).join("\n\n");
    sections.push({ title: "实习经历", content: text });
  } else if (p.experience?.length) {
    sections.push({ title: "经历", content: p.experience.join("\n") });
  }
  if (p.strengths?.length) sections.push({ title: "个人优势", content: p.strengths.join("、") });
  if (p.summary) sections.push({ title: "自我评价", content: p.summary });
  return sections;
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

interface OfferCard {
  id: number;
  company: string;
  department: string;
  position: string;
  salary: string;
  notes: string;
}

interface ExperienceCard {
  id: number;
  company: string;
  department: string;
  position: string;
  description: string;
}

let _nextCardId = 1;
function createCard(): OfferCard {
  return { id: _nextCardId++, company: "", department: "", position: "", salary: "", notes: "" };
}

let _nextExpId = 1;
function createExpCard(): ExperienceCard {
  return { id: _nextExpId++, company: "", department: "", position: "", description: "" };
}

function serializeExpCards(cards: ExperienceCard[]): string {
  return cards
    .filter((c) => c.company || c.position || c.description)
    .map((c, i) => {
      const lines = [`经历 ${i + 1}:`];
      if (c.company) lines.push(`公司: ${c.company}`);
      if (c.department) lines.push(`业务线/部门: ${c.department}`);
      if (c.position) lines.push(`职位: ${c.position}`);
      if (c.description) lines.push(`工作内容: ${c.description}`);
      return lines.join("\n");
    })
    .join("\n---\n");
}

function serializeCards(cards: OfferCard[]): string {
  return cards
    .filter((c) => c.company || c.position)
    .map((c, i) => {
      const lines = [`Offer ${i + 1}:`];
      if (c.company) lines.push(`公司: ${c.company}`);
      if (c.department) lines.push(`业务线/部门: ${c.department}`);
      if (c.position) lines.push(`职位: ${c.position}`);
      if (c.salary) lines.push(`薪资福利: ${c.salary}`);
      if (c.notes) lines.push(`备注: ${c.notes}`);
      return lines.join("\n");
    })
    .join("\n---\n");
}

function formatForXiaohongshu(result: OfferCompareResult | JdCompareResult, cards: OfferCard[]): string {
  const lines: string[] = [];
  const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];
  cards.filter((c) => c.company || c.position).forEach((c, i) => {
    lines.push(`${emojis[i] ?? `${i + 1}.`} ${c.company} ${c.position}`);
    if (c.department) lines.push(`   ${c.department}`);
    if (c.salary) lines.push(`   💰 ${c.salary}`);
    if (c.notes) lines.push(`   📝 ${c.notes}`);
  });
  lines.push("");
  if ("comparison" in result) {
    lines.push("🔍 对比分析：");
    result.comparison.forEach((c) => lines.push(`▫️ ${c.dimension}：${c.analysis}`));
    lines.push("");
    lines.push(`✅ 推荐：${result.recommendation}`);
    lines.push(`💡 理由：${result.reason}`);
    if (result.risks) lines.push(`⚠️ 风险：${result.risks}`);
  } else {
    lines.push("🏆 匹配排名：");
    result.rankings.forEach((r) => lines.push(`${r.rank}. ${r.company} ${r.position} - ${r.score}分 (${r.priority}优先级)`));
    lines.push("");
    if (result.strategy) lines.push(`📌 策略：${result.strategy}`);
  }
  lines.push("");
  lines.push("#求职 #offer对比 #校招 #秋招");
  return lines.join("\n");
}

function StructuredInputCard({ card, index, onChange, onRemove, canRemove, label }: {
  card: OfferCard; index: number; label?: string;
  onChange: (id: number, field: keyof OfferCard, value: string) => void;
  onRemove: (id: number) => void; canRemove: boolean;
}) {
  return (
    <div className="p-4 rounded-[var(--radius-xs)] border border-[var(--border-s)] bg-[var(--surface-solid)] space-y-2.5 relative">
      {canRemove && (
        <button onClick={() => onRemove(card.id)}
          className="absolute top-2 right-2 w-6 h-6 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition text-xs">
          ×
        </button>
      )}
      <div className="text-xs font-bold text-gray-700">{label ?? "Offer"} {index + 1}</div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-gray-400 block mb-0.5">公司</label>
          <input value={card.company} onChange={(e) => onChange(card.id, "company", e.target.value)}
            placeholder="如：字节跳动" className="w-full px-2 py-1.5 rounded-[var(--radius-xs)] border border-[var(--border-s)] text-xs focus:outline-none focus:border-brand-500" />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 block mb-0.5">业务线/部门</label>
          <input value={card.department} onChange={(e) => onChange(card.id, "department", e.target.value)}
            placeholder="如：抖音电商" className="w-full px-2 py-1.5 rounded-[var(--radius-xs)] border border-[var(--border-s)] text-xs focus:outline-none focus:border-brand-500" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-gray-400 block mb-0.5">职位</label>
          <input value={card.position} onChange={(e) => onChange(card.id, "position", e.target.value)}
            placeholder="如：AI产品经理" className="w-full px-2 py-1.5 rounded-[var(--radius-xs)] border border-[var(--border-s)] text-xs focus:outline-none focus:border-brand-500" />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 block mb-0.5">薪资福利</label>
          <input value={card.salary} onChange={(e) => onChange(card.id, "salary", e.target.value)}
            placeholder="如：25k/月, 15薪" className="w-full px-2 py-1.5 rounded-[var(--radius-xs)] border border-[var(--border-s)] text-xs focus:outline-none focus:border-brand-500" />
        </div>
      </div>
      <div>
        <label className="text-[10px] text-gray-400 block mb-0.5">优缺点/备注</label>
        <textarea value={card.notes} onChange={(e) => onChange(card.id, "notes", e.target.value)}
          placeholder="如：base 北京, 业务前景好, 压力大..." rows={2}
          className="w-full px-2 py-1.5 rounded-[var(--radius-xs)] border border-[var(--border-s)] text-xs resize-none focus:outline-none focus:border-brand-500" />
      </div>
    </div>
  );
}

function ExperienceInputCard({ card, index, onChange, onRemove, canRemove }: {
  card: ExperienceCard; index: number;
  onChange: (id: number, field: keyof ExperienceCard, value: string) => void;
  onRemove: (id: number) => void; canRemove: boolean;
}) {
  return (
    <div className="p-4 rounded-[var(--radius-xs)] border border-[var(--border-s)] bg-[var(--surface-solid)] space-y-2.5 relative">
      {canRemove && (
        <button onClick={() => onRemove(card.id)}
          className="absolute top-2 right-2 w-6 h-6 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition text-xs">
          ×
        </button>
      )}
      <div className="text-xs font-bold text-gray-700">经历 {index + 1}</div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-gray-400 block mb-0.5">公司</label>
          <input value={card.company} onChange={(e) => onChange(card.id, "company", e.target.value)}
            placeholder="如：字节跳动" className="w-full px-2 py-1.5 rounded-[var(--radius-xs)] border border-[var(--border-s)] text-xs focus:outline-none focus:border-brand-500" />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 block mb-0.5">业务/部门</label>
          <input value={card.department} onChange={(e) => onChange(card.id, "department", e.target.value)}
            placeholder="如：抖音电商" className="w-full px-2 py-1.5 rounded-[var(--radius-xs)] border border-[var(--border-s)] text-xs focus:outline-none focus:border-brand-500" />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 block mb-0.5">职位</label>
          <input value={card.position} onChange={(e) => onChange(card.id, "position", e.target.value)}
            placeholder="如：产品运营" className="w-full px-2 py-1.5 rounded-[var(--radius-xs)] border border-[var(--border-s)] text-xs focus:outline-none focus:border-brand-500" />
        </div>
      </div>
      <div>
        <label className="text-[10px] text-gray-400 block mb-0.5">具体工作内容</label>
        <textarea value={card.description} onChange={(e) => onChange(card.id, "description", e.target.value)}
          placeholder="如：负责抖音电商活动策划，用户增长10%..." rows={3}
          className="w-full px-2 py-1.5 rounded-[var(--radius-xs)] border border-[var(--border-s)] text-xs resize-none focus:outline-none focus:border-brand-500" />
      </div>
    </div>
  );
}

export default function SkillsClient({ jobs }: { jobs: Job[] }) {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [active, setActive] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [jobInput, setJobInput] = useState("");
  const [expCards, setExpCards] = useState<ExperienceCard[]>(() => [createExpCard()]);
  const [offersInput, setOffersInput] = useState("");
  const [selectedJds, setSelectedJds] = useState<Job[]>([]);
  const [offerCards, setOfferCards] = useState<OfferCard[]>(() => [createCard(), createCard()]);
  const [jdCards, setJdCards] = useState<OfferCard[]>(() => [createCard(), createCard()]);
  const [shareToast, setShareToast] = useState(false);
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
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeRefineInput, setResumeRefineInput] = useState("");
  const [resumeRefineLoading, setResumeRefineLoading] = useState(false);
  const [resumeRefineChanges, setResumeRefineChanges] = useState("");
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
    if (!optimizeResult) return;
    const sections =
      optimizeResult.resumeOriginal?.sections ??
      optimizeResult.resume?.sections ??
      (prefs ? buildSectionsFromPrefs(prefs) : []);
    if (sections.length) setDisplaySections(sections.map((s) => ({ ...s })));
  }, [optimizeResult]);

  useEffect(() => {
    if (letterResult?.letter) {
      setLetterText(letterResult.letter);
      setLetterChanges("");
    }
  }, [letterResult]);

  async function run() {
    if (!active) return;
    setLoading(true);
    setError("");
    const profile = profileToText(prefs);
    try {
      if (active === "interview") {
        const r = await generateInterview(profile, jobInput);
        setInterviewResult(r.questions);
      } else if (active === "resume-optimize") {
        const r = await optimizeResume(profile, jobInput, serializeExpCards(expCards));
        setOptimizeResult(r);
        setAppliedIds(new Set());
      } else if (active === "cover-letter") {
        const r = await generateCoverLetter(profile, jobInput);
        setLetterResult(r);
      } else if (active === "offer") {
        const offersText = serializeCards(offerCards);
        if (!offersText) { setError("请至少填写 2 个 Offer 的公司或职位"); setLoading(false); return; }
        const r = await compareOffers(profile, offersText);
        setOfferResult(r);
      } else if (active === "jd-match") {
        const r = await analyzeJdMatch(profile, jobInput);
        setJdMatchResult(r);
      } else if (active === "jd-compare") {
        const jdsText = serializeCards(jdCards);
        if (!jdsText) { setError("请至少填写 2 个岗位的公司或职位"); setLoading(false); return; }
        const r = await compareJds(profile, jdsText);
        setJdCompareResult(r);
      }
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }

  async function runInterviewDirect() {
    setLoading(true);
    setError("");
    const profile = profileToText(prefs);
    const job = prefs?.targetRoles?.join("、") ?? "";
    try {
      const r = await generateInterview(profile, job);
      setInterviewResult(r.questions);
      setExpandedQuestions(new Set());
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }

  async function runInterviewFollowup(instruction?: string) {
    const followupText = instruction || interviewFollowupInput.trim();
    if (!interviewResult?.length || !followupText) return;
    if (instruction) setInterviewFollowupInput(instruction);
    setInterviewFollowupLoading(true);
    setError("");
    const profile = profileToText(prefs);
    const job = prefs?.targetRoles?.join("、") ?? "";
    const previous = interviewResult.map((q, i) => `${i + 1}. [${q.category}] ${q.question}`).join("\n");
    try {
      const r = await followupInterview(profile, job, previous, followupText);
      if (!r.questions?.length) {
        setError("AI 未生成新题目，请换个追问方向重试");
      } else {
        setInterviewResult([...interviewResult, ...r.questions]);
        setInterviewFollowupInput("");
      }
    } catch (e) {
      setError((e as Error).message);
    }
    setInterviewFollowupLoading(false);
  }

  async function runLetterRefine(instruction?: string) {
    if (!letterText.trim()) return;
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

  async function handleResumeUpload(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("暂只支持 PDF 格式简历");
      return;
    }
    setResumeUploading(true);
    setError("");
    try {
      const text = await extractPdfText(file);
      const parsed = await parseResumeWithAI(text);
      if (parsed.experiences?.length) {
        setExpCards(parsed.experiences.map((exp, i) => ({
          id: Date.now() + i,
          company: exp.company || "",
          department: exp.department || "",
          position: exp.role || "",
          description: [
            exp.duration ? `时间: ${exp.duration}` : "",
            exp.highlights?.length ? exp.highlights.join("; ") : "",
            exp.description || "",
          ].filter(Boolean).join("\n"),
        })));
      } else if (parsed.experience?.length) {
        setExpCards(parsed.experience.map((text, i) => ({
          id: Date.now() + i,
          company: "",
          department: "",
          position: "",
          description: text,
        })));
      }
    } catch (e) {
      setError((e as Error).message);
    }
    setResumeUploading(false);
  }

  async function runResumeRefine(instruction?: string) {
    if (!displaySections.length) return;
    const refineInstruction = instruction || resumeRefineInput.trim();
    if (!refineInstruction) return;
    setResumeRefineLoading(true);
    setError("");
    const profile = profileToText(prefs);
    const resumeText = displaySections.map((s) => `【${s.title}】\n${s.content}`).join("\n\n");
    try {
      const r = await refineResume(profile, jobInput, resumeText, refineInstruction);
      if (r.sections?.length) {
        setDisplaySections(r.sections.map((s) => ({ ...s })));
      }
      setResumeRefineChanges(r.changes || "");
      setResumeRefineInput("");
    } catch (e) {
      setError((e as Error).message);
    }
    setResumeRefineLoading(false);
  }

  function applySuggestion(suggestion: { section: string; original: string; improved: string; id: number }) {
    setDisplaySections((prev) =>
      prev.map((s) => {
        if (s.content.includes(suggestion.original)) {
          return { ...s, content: s.content.replace(suggestion.original, suggestion.improved) };
        }
        if (s.title === suggestion.section || s.title.includes(suggestion.section) || suggestion.section.includes(s.title)) {
          return { ...s, content: s.content + "\n" + suggestion.improved };
        }
        return s;
      })
    );
    setAppliedIds((prev) => new Set([...prev, suggestion.id]));
  }

  function applyAll() {
    if (!optimizeResult) return;
    if (optimizeResult.resume?.sections?.length) {
      setDisplaySections(optimizeResult.resume.sections.map((s) => ({ ...s })));
    } else {
      optimizeResult.suggestions.forEach((s) => applySuggestion(s));
    }
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
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[var(--surface-solid)]/60 border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-[15px] font-black tracking-tight text-brand-500 hover:text-brand-600 transition">← Career Search</a>
            <span className="text-gray-300">·</span>
            <span className="text-[15px] font-medium text-gray-500">AI 求职工具</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {!loggedIn ? (
          <div className="card p-12 text-center">
            <h2 className="text-lg font-bold text-gray-900 mb-2">请先登录</h2>
            <p className="text-sm text-gray-500 mb-4">登录后即可使用 AI 工具，设置画像可获得更精准的结果</p>
            <a href="/profile/" className="px-4 py-2 rounded-[var(--radius-xs)] text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition">去登录</a>
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
                    setInterviewResult(null); setLetterResult(null); setOfferResult(null); setJdMatchResult(null); setJdCompareResult(null); setOptimizeResult(null); setAppliedIds(new Set()); setExpandedQuestions(new Set()); setInterviewFollowupInput(""); setError(""); setDisplaySections([]); setLetterText(""); setLetterRefineInput(""); setLetterRefineLoading(false); setLetterChanges(""); setJobSearchQuery(""); setSelectedJds([]); setOfferCards([createCard(), createCard()]); setJdCards([createCard(), createCard()]); setShareToast(false);
                    if (s.key === "resume-optimize" && prefs) {
                      if (prefs.experiences?.length) {
                        setExpCards(prefs.experiences.map((e) => ({
                          id: _nextExpId++,
                          company: e.company ?? "",
                          department: e.department ?? "",
                          position: e.role ?? "",
                          description: [e.description, e.highlights?.length ? `成果: ${e.highlights.join("; ")}` : ""].filter(Boolean).join("\n"),
                        })));
                      } else {
                        setExpCards([createExpCard()]);
                      }
                    }
                    if (["resume-optimize", "cover-letter", "jd-match"].includes(s.key) && !jobInput && prefs?.targetRoles?.length) {
                      setJobInput(prefs.targetRoles.join("、"));
                    }
                    if (s.key === "interview") {
                      runInterviewDirect();
                    }
                  }}
                  className={`card p-4 text-left transition ${active === s.key ? "border-brand-500 shadow-md" : "hover:border-[var(--border-s)]"}`}
                >
                  <div className="text-3xl mb-2">{s.icon}</div>
                  <div className="text-sm font-extrabold text-gray-900">{s.label}</div>
                  <div className="text-[11px] text-gray-500 mt-1">{s.desc}</div>
                  <div className="text-[11px] text-brand-500 font-semibold mt-2">开始使用 →</div>
                </button>
              ))}
            </div>

            {/* Input area — skip for interview (auto-generates from profile) */}
            {active && active !== "interview" && (
              <div className="card p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-900">{SKILLS.find((s) => s.key === active)?.label}</h3>

                {prefs ? (
                <div className="p-3 rounded-[var(--radius-xs)] bg-brand-50/60 border border-brand-100 flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold">AI</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-brand-500 mb-1">已自动加载你的画像</div>
                    <div className="text-[11px] text-brand-500 truncate">
                      {[prefs?.school, prefs?.major, prefs?.degree].filter(Boolean).join(" · ")}
                      {(prefs?.skills?.length ?? 0) > 0 && ` · ${prefs!.skills!.slice(0, 3).join(", ")}${prefs!.skills!.length > 3 ? "..." : ""}`}
                    </div>
                    {((prefs?.experiences?.length ?? 0) > 0 || (prefs?.experience?.length ?? 0) > 0) && (
                      <div className="text-[11px] text-brand-500 mt-0.5">{prefs!.experiences?.length ?? prefs!.experience!.length} 段经历已就绪</div>
                    )}
                  </div>
                  <a href="/profile/" className="shrink-0 text-[11px] text-brand-500 hover:text-brand-600 underline">修改</a>
                </div>
                ) : (
                <div className="p-3 rounded-[var(--radius-xs)] bg-amber-50/60 border border-amber-100 flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-amber-400 text-white flex items-center justify-center text-sm font-bold">!</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-amber-700 mb-1">未设置画像</div>
                    <div className="text-[11px] text-amber-600">设置画像后，AI 结果将更加个性化和精准</div>
                  </div>
                  <a href="/profile/" className="shrink-0 text-[11px] text-amber-600 hover:text-amber-700 underline">去设置</a>
                </div>
                )}

                {(active === "resume-optimize" || active === "cover-letter" || active === "jd-match") && (
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 mb-1 block">目标岗位（搜索导入或粘贴 JD）</label>
                    <div className="relative">
                      <input
                        value={jobSearchQuery}
                        onChange={(e) => setJobSearchQuery(e.target.value)}
                        placeholder="搜索公司、岗位名、城市..."
                        className="w-full pl-8 pr-3 py-2 rounded-[var(--radius-xs)] border border-[var(--border-s)] text-sm focus:outline-none focus:border-brand-500"
                      />
                      <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    {searchedJobs.length > 0 && (
                      <div className="max-h-[200px] overflow-y-auto rounded-[var(--radius-xs)] border border-[var(--border-s)] divide-y divide-gray-50">
                        {searchedJobs.map((j) => (
                          <button
                            key={j.id}
                            onClick={() => {
                              setJobInput(`${j.company} - ${j.title}\n${j.description ?? ""}\n技能要求: ${j.aiTags?.skills.join(", ") ?? ""}`);
                              setJobSearchQuery("");
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-brand-50 transition flex items-center justify-between gap-2"
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
                            <span className="shrink-0 text-[10px] text-brand-500 font-medium">导入</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <textarea
                      value={jobInput}
                      onChange={(e) => setJobInput(e.target.value)}
                      placeholder="如：字节跳动 AI产品经理，或粘贴完整 JD..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-[var(--radius-xs)] border border-[var(--border-s)] text-sm resize-none focus:outline-none focus:border-brand-500"
                    />
                  </div>
                )}

                {active === "resume-optimize" && (
                  <div className="space-y-3">
                    <label className="text-xs text-gray-500 block">你的经历（每段经历一张卡片）</label>
                    <label className={`flex items-center justify-center gap-2 py-3 rounded-[var(--radius-xs)] border border-dashed cursor-pointer transition ${resumeUploading ? "border-brand-400 bg-brand-50" : "border-[var(--border-s)] hover:border-brand-400 hover:bg-brand-50/50"}`}>
                      <input type="file" accept=".pdf" className="hidden" disabled={resumeUploading}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleResumeUpload(f); e.target.value = ""; }} />
                      {resumeUploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                          <span className="text-xs text-brand-500 font-medium">解析中...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                          <span className="text-xs text-gray-500">上传 PDF 简历自动解析经历</span>
                        </>
                      )}
                    </label>
                    <div className="space-y-3">
                      {expCards.map((card, i) => (
                        <ExperienceInputCard key={card.id} card={card} index={i}
                          onChange={(id, field, value) => setExpCards((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c))}
                          onRemove={(id) => setExpCards((prev) => prev.filter((c) => c.id !== id))}
                          canRemove={expCards.length > 1} />
                      ))}
                    </div>
                    {expCards.length < 6 && (
                      <button onClick={() => setExpCards((prev) => [...prev, createExpCard()])}
                        className="w-full py-2 rounded-[var(--radius-xs)] border border-dashed border-[var(--border-s)] text-xs text-gray-500 hover:border-brand-400 hover:text-brand-600 transition">
                        + 添加经历
                      </button>
                    )}
                  </div>
                )}

                {active === "offer" && (
                  <div className="space-y-3">
                    <label className="text-xs text-gray-500 block">待对比的 Offer</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {offerCards.map((card, i) => (
                        <StructuredInputCard key={card.id} card={card} index={i} label="Offer"
                          onChange={(id, field, value) => setOfferCards((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c))}
                          onRemove={(id) => setOfferCards((prev) => prev.filter((c) => c.id !== id))}
                          canRemove={offerCards.length > 2} />
                      ))}
                    </div>
                    {offerCards.length < 5 && (
                      <button onClick={() => setOfferCards((prev) => [...prev, createCard()])}
                        className="w-full py-2 rounded-[var(--radius-xs)] border border-dashed border-[var(--border-s)] text-xs text-gray-500 hover:border-brand-400 hover:text-brand-600 transition">
                        + 添加 Offer
                      </button>
                    )}
                  </div>
                )}

                {active === "jd-compare" && (
                  <div className="space-y-3">
                    <label className="text-xs text-gray-500 block">待对比的岗位（手动填写或搜索导入）</label>
                    <div className="relative">
                      <input value={jobSearchQuery} onChange={(e) => setJobSearchQuery(e.target.value)}
                        placeholder="搜索公司/岗位名导入到卡片..."
                        className="w-full pl-8 pr-3 py-2 rounded-[var(--radius-xs)] border border-[var(--border-s)] text-sm focus:outline-none focus:border-brand-500" />
                      <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    {searchedJobs.length > 0 && (
                      <div className="max-h-[200px] overflow-y-auto rounded-[var(--radius-xs)] border border-[var(--border-s)] divide-y divide-gray-50">
                        {searchedJobs.map((j) => (
                          <button key={j.id} onClick={() => {
                            const emptyIdx = jdCards.findIndex((c) => !c.company && !c.position);
                            const filled = { company: j.company, position: j.title, department: "", salary: j.salary ?? "", notes: j.aiTags?.skills.slice(0, 5).join(", ") ?? "" };
                            if (emptyIdx >= 0) {
                              setJdCards((prev) => prev.map((c, i) => i === emptyIdx ? { ...c, ...filled } : c));
                            } else if (jdCards.length < 5) {
                              setJdCards((prev) => [...prev, { ...createCard(), ...filled }]);
                            }
                            setJobSearchQuery("");
                          }} className="w-full px-3 py-2 text-left hover:bg-brand-50 transition flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-gray-900 truncate">{j.company} · {j.title}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-gray-400">{j.location[0] ?? ""}</span>
                                {j.aiTags?.skills.slice(0, 3).map((s) => (
                                  <span key={s} className="text-[10px] px-1 py-0 rounded bg-gray-100 text-gray-500">{s}</span>
                                ))}
                              </div>
                            </div>
                            <span className="shrink-0 text-[10px] text-brand-500 font-medium">导入</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {jdCards.map((card, i) => (
                        <StructuredInputCard key={card.id} card={card} index={i} label="岗位"
                          onChange={(id, field, value) => setJdCards((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c))}
                          onRemove={(id) => setJdCards((prev) => prev.filter((c) => c.id !== id))}
                          canRemove={jdCards.length > 2} />
                      ))}
                    </div>
                    {jdCards.length < 5 && (
                      <button onClick={() => setJdCards((prev) => [...prev, createCard()])}
                        className="w-full py-2 rounded-[var(--radius-xs)] border border-dashed border-[var(--border-s)] text-xs text-gray-500 hover:border-brand-400 hover:text-brand-600 transition">
                        + 添加岗位
                      </button>
                    )}
                  </div>
                )}

                {error && <div className="p-3 rounded-[var(--radius-xs)] bg-red-50 text-xs text-red-600">{error}</div>}

                <button
                  onClick={run}
                  disabled={loading}
                  className="w-full py-2.5 rounded-[var(--radius-xs)] text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 shadow-sm transition"
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
                    <div className="text-brand-500 font-medium text-sm">AI 正在根据你的画像生成面试题...</div>
                    <div className="text-[11px] text-gray-400 mt-2">{[prefs?.school, prefs?.major, ...(prefs?.targetRoles ?? []).slice(0, 2)].filter(Boolean).join(" · ") || "通用面试题"}</div>
                  </div>
                )}

                {error && !interviewResult && (
                  <div className="card p-5">
                    <div className="p-3 rounded-[var(--radius-xs)] bg-red-50 text-xs text-red-600 mb-3">{error}</div>
                    <button onClick={runInterviewDirect} className="w-full py-2.5 rounded-[var(--radius-xs)] text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 shadow-sm transition">
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
                        className="text-[11px] text-brand-500 hover:text-brand-600"
                      >
                        {expandedQuestions.size === interviewResult.length ? "全部收起" : "展开全部答案"}
                      </button>
                    </div>
                    {interviewResult.map((q, i) => {
                      const isExpanded = expandedQuestions.has(i);
                      return (
                        <div key={i} className="rounded-[var(--radius-xs)] border border-[var(--border)] overflow-hidden">
                          <button
                            onClick={() => setExpandedQuestions((prev) => {
                              const next = new Set(prev);
                              if (next.has(i)) next.delete(i); else next.add(i);
                              return next;
                            })}
                            className="w-full p-3 text-left flex items-start gap-2 hover:bg-brand-50 transition"
                          >
                            <span className="shrink-0 w-6 h-6 rounded-full bg-brand-50 text-brand-500 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900">{q.question}</div>
                              <div className="flex gap-2 mt-1.5">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                  q.category === "技术" ? "bg-blue-50 text-blue-600" :
                                  q.category === "业务" ? "bg-brand-50 text-brand-500" :
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
                            <div className="px-3 pb-3 pt-0 ml-8 mr-3 space-y-2 border-t border-[var(--border)]">
                              <div className="pt-2">
                                <div className="text-[11px] font-semibold text-brand-500 mb-1">回答要点</div>
                                <div className="text-xs text-gray-600 leading-relaxed">{q.tips}</div>
                              </div>
                              <div className="p-2.5 rounded-[var(--radius-xs)] bg-[var(--surface)]">
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
                      className="w-full px-3 py-2 rounded-[var(--radius-xs)] border border-[var(--border-s)] text-sm resize-none focus:outline-none focus:border-brand-500"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[10px] text-gray-400">快速追问：</span>
                      {["再来几道技术题", "行为面试题", "压力面试题", "HR 面常见题"].map((t) => (
                        <button key={t} onClick={() => runInterviewFollowup(t)}
                          disabled={interviewFollowupLoading}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-500 hover:bg-brand-100 hover:text-brand-600 transition disabled:opacity-50">
                          {t}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => runInterviewFollowup()}
                      disabled={interviewFollowupLoading || !interviewFollowupInput.trim()}
                      className="w-full py-2.5 rounded-[var(--radius-xs)] text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 shadow-sm transition"
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
                    <span className={`text-xl font-bold font-mono ${optimizeResult.originalScore >= 60 ? "text-amber-600" : "text-red-500"}`}>{optimizeResult.originalScore}分</span>
                  </div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden relative">
                    <div className="absolute h-full bg-gray-300 rounded-full" style={{ width: `${optimizeResult.originalScore}%` }} />
                    <div className="absolute h-full bg-brand-500 rounded-full transition-all" style={{ width: `${optimizeResult.optimizedScore}%`, opacity: 0.3 }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">优化版</span>
                    <span className="text-xl font-bold font-mono text-brand-500">{optimizeResult.optimizedScore}分</span>
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
                          const sections =
                            optimizeResult.resumeOriginal?.sections ??
                            optimizeResult.resume?.sections ??
                            (prefs ? buildSectionsFromPrefs(prefs) : []);
                          if (sections.length) setDisplaySections(sections.map((s) => ({ ...s })));
                        }}
                        className="px-3 py-1.5 rounded-[var(--radius-xs)] text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                      >
                        重置
                      </button>
                    )}
                    <button
                      onClick={applyAll}
                      className="px-3 py-1.5 rounded-[var(--radius-xs)] text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition"
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
                              <div key={s.id} className={`p-3 rounded-[var(--radius-xs)] border transition ${applied ? "border-green-200 bg-green-50/50" : "border-[var(--border)] bg-[var(--surface-solid)]"}`}>
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
                                  {s.tags.map((t) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-500">{t}</span>)}
                                </div>
                                <div className="text-[11px] text-gray-400 mb-1">BEFORE</div>
                                <div className="text-xs text-gray-500 line-through mb-2">{s.original}</div>
                                <div className="text-[11px] text-brand-500 mb-1">AFTER</div>
                                <div className="text-xs text-gray-900 font-medium mb-2">{s.improved}</div>
                                <div className="text-[11px] text-gray-400 mb-2">{s.reason}</div>
                                {!applied && (
                                  <button
                                    onClick={() => applySuggestion(s)}
                                    className="text-[11px] px-3 py-1 rounded-[var(--radius-xs)] bg-brand-500 text-white hover:bg-brand-600 transition"
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
                      <div className="mt-4 p-4 rounded-[var(--radius-xs)] border border-[var(--border)] bg-[var(--surface)] space-y-3">
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
                    <div className="border border-[var(--border)] rounded-[var(--radius-xs)] overflow-hidden bg-[var(--surface-solid)]">
                      <div className="px-5 py-3 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-gray-700">
                          {appliedIds.size === optimizeResult.suggestions.length ? "优化版简历" : "简历预览"}
                          <span className="ml-1.5 text-[10px] font-normal text-gray-400">{appliedIds.size}/{optimizeResult.suggestions.length} 处已应用</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => exportPDF(displaySections, prefs?.school ?? "简历")}
                            className="text-[11px] px-2.5 py-1 rounded-[var(--radius-xs)] bg-brand-500 text-white hover:bg-brand-600 font-medium transition"
                          >
                            PDF
                          </button>
                          <button
                            onClick={() => exportWord(displaySections, prefs?.school ?? "简历")}
                            className="text-[11px] px-2.5 py-1 rounded-[var(--radius-xs)] bg-blue-500 text-white hover:bg-blue-600 font-medium transition"
                          >
                            Word
                          </button>
                          <button
                            onClick={() => {
                              const text = displaySections.map((s) => `【${s.title}】\n${s.content}`).join("\n\n");
                              navigator.clipboard.writeText(text).then(() => alert("已复制到剪贴板"));
                            }}
                            className="text-[11px] px-2.5 py-1 rounded-[var(--radius-xs)] bg-gray-200 text-gray-700 hover:bg-gray-300 font-medium transition"
                          >
                            复制
                          </button>
                        </div>
                      </div>
                      {displaySections.length > 0 ? displaySections.map((s, i) => (
                        <div key={i} className={`px-5 py-3 ${i > 0 ? "border-t border-[var(--border)]" : ""}`}>
                          <div className="text-xs font-bold text-gray-800 mb-1.5">{s.title}</div>
                          <textarea
                            value={s.content}
                            onChange={(e) => setDisplaySections((prev) => prev.map((sec, idx) => idx === i ? { ...sec, content: e.target.value } : sec))}
                            rows={Math.max(3, s.content.split("\n").length + 1)}
                            className="w-full text-xs text-gray-600 leading-relaxed resize-y border border-transparent rounded-[var(--radius-xs)] px-1 py-0.5 hover:border-[var(--border-s)] focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-200 transition"
                          />
                        </div>
                      )) : (
                        <div className="px-5 py-12 text-center">
                          <div className="text-sm text-gray-400 mb-2">简历预览加载中...</div>
                          <div className="text-[11px] text-gray-300">如长时间无内容，请点击"一键全部应用"或重新生成</div>
                        </div>
                      )}
                    </div>

                    {displaySections.length > 0 && (
                      <div className="mt-4 border border-[var(--border)] rounded-[var(--radius-xs)] p-4 space-y-3">
                        <h4 className="text-xs font-bold text-gray-700">AI 修改</h4>
                        <textarea
                          value={resumeRefineInput}
                          onChange={(e) => setResumeRefineInput(e.target.value)}
                          placeholder="如：突出量化成果 / 加强技术描述 / 更简洁 / 优化排版..."
                          rows={2}
                          className="w-full px-3 py-2 rounded-[var(--radius-xs)] border border-[var(--border-s)] text-sm resize-none focus:outline-none focus:border-brand-500"
                        />
                        {resumeRefineChanges && (
                          <div className="px-3 py-2 rounded-[var(--radius-xs)] bg-green-50 border border-green-100 text-xs text-green-700">
                            本次修改：{resumeRefineChanges}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-[10px] text-gray-400">快速修改：</span>
                          {["更专业", "更简洁", "突出量化成果", "加强技术描述", "突出领导力", "优化排版"].map((t) => (
                            <button key={t} onClick={() => runResumeRefine(t)}
                              disabled={resumeRefineLoading}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-500 hover:bg-brand-100 hover:text-brand-600 transition disabled:opacity-50">
                              {t}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => runResumeRefine()}
                          disabled={resumeRefineLoading || !resumeRefineInput.trim()}
                          className="w-full py-2.5 rounded-[var(--radius-xs)] text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 shadow-sm transition"
                        >
                          {resumeRefineLoading ? "AI 修改中..." : "AI 修改"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Keywords + tips */}
                <div className="flex flex-wrap gap-1.5">
                  {optimizeResult.keywords.map((k) => <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-500">{k}</span>)}
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
                      className="text-[11px] px-2.5 py-1 rounded-[var(--radius-xs)] bg-gray-200 text-gray-700 hover:bg-gray-300 font-medium transition"
                    >
                      复制
                    </button>
                    <button
                      onClick={() => exportWord([{ title: "求职信", content: letterText }], "求职信")}
                      className="text-[11px] px-2.5 py-1 rounded-[var(--radius-xs)] bg-blue-500 text-white hover:bg-blue-600 font-medium transition"
                    >
                      Word
                    </button>
                  </div>
                </div>

                <textarea
                  value={letterText}
                  onChange={(e) => setLetterText(e.target.value)}
                  rows={14}
                  className="w-full px-4 py-3 rounded-[var(--radius-xs)] border border-[var(--border-s)] text-sm text-gray-700 leading-relaxed resize-y focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                />

                {letterChanges && (
                  <div className="px-3 py-2 rounded-[var(--radius-xs)] bg-green-50 border border-green-100 text-xs text-green-700">
                    本次修改：{letterChanges}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {letterResult.highlights.map((h) => <span key={h} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-500">{h}</span>)}
                </div>
                {letterResult.tips && <p className="text-xs text-gray-500">{letterResult.tips}</p>}

                <div className="border-t border-[var(--border)] pt-3 space-y-3">
                  <h4 className="text-xs font-bold text-gray-700">AI 修改</h4>
                  <textarea
                    value={letterRefineInput}
                    onChange={(e) => setLetterRefineInput(e.target.value)}
                    placeholder="如：让开头更有吸引力 / 突出Python技能 / 语气更正式 / 缩短到300字..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-[var(--radius-xs)] border border-[var(--border-s)] text-sm resize-none focus:outline-none focus:border-brand-500"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[10px] text-gray-400">快速修改：</span>
                    {["更正式", "更简洁", "突出实习经历", "加强技术能力描述", "调整开头更有吸引力", "缩短到300字"].map((t) => (
                      <button key={t} onClick={() => runLetterRefine(t)}
                        disabled={letterRefineLoading}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-500 hover:bg-brand-100 hover:text-brand-600 transition disabled:opacity-50">
                        {t}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => runLetterRefine()}
                    disabled={letterRefineLoading || !letterRefineInput.trim()}
                    className="w-full py-2.5 rounded-[var(--radius-xs)] text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 shadow-sm transition"
                  >
                    {letterRefineLoading ? "AI 修改中..." : "AI 修改"}
                  </button>
                </div>

                <button
                  onClick={run}
                  disabled={loading}
                  className="w-full py-2 rounded-[var(--radius-xs)] text-xs font-medium text-gray-500 border border-[var(--border-s)] hover:bg-[var(--surface)] transition"
                >
                  重新生成（从零开始）
                </button>
              </div>
            )}

            {offerResult && (
              <div className="card p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Offer 对比分析</h3>
                {offerCards.filter((c) => c.company || c.position).map((card, cardIdx) => (
                  <div key={card.id} className="rounded-[var(--radius-sm)] border border-[var(--border)] overflow-hidden">
                    <div className="px-4 py-2.5 bg-[var(--surface)] border-b border-[var(--border)] flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center">{cardIdx + 1}</span>
                      <span className="text-sm font-bold text-gray-900">{card.company}</span>
                      {card.department && <span className="text-xs text-gray-500">{card.department}</span>}
                      <span className="text-xs text-gray-500">{card.position}</span>
                      {card.salary && <span className="text-xs text-brand-500 font-mono ml-auto">{card.salary}</span>}
                    </div>
                    <div className="p-4 space-y-2">
                      {offerResult.comparison.map((c) => (
                        <div key={c.dimension} className="flex gap-2 text-xs">
                          <span className="shrink-0 font-semibold text-gray-600 w-20 text-right">{c.dimension}</span>
                          <span className="text-gray-700 leading-relaxed">{c.analysis.split(/[；;]/).filter((seg) => {
                            const name = card.company.slice(0, 2);
                            return seg.includes(name) || seg.includes(`Offer ${cardIdx + 1}`) || seg.includes(`offer${cardIdx + 1}`);
                          }).join("；") || c.analysis}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="p-4 rounded-[var(--radius-sm)] bg-brand-50 border border-brand-100">
                  <div className="text-sm font-bold text-brand-500 mb-1">推荐：{offerResult.recommendation}</div>
                  <div className="text-xs text-brand-500 leading-relaxed">{offerResult.reason}</div>
                </div>
                {offerResult.risks && <div className="text-xs text-gray-600 bg-amber-50 rounded-[var(--radius-xs)] p-3 border border-amber-100"><strong className="text-amber-700">风险提示：</strong>{offerResult.risks}</div>}
                {offerResult.negotiation && <div className="text-xs text-gray-600 bg-blue-50 rounded-[var(--radius-xs)] p-3 border border-blue-100"><strong className="text-blue-700">谈薪建议：</strong>{offerResult.negotiation}</div>}
                <button onClick={() => {
                  navigator.clipboard.writeText(formatForXiaohongshu(offerResult, offerCards));
                  setShareToast(true); setTimeout(() => setShareToast(false), 2000);
                  window.open("https://www.xiaohongshu.com/explore", "_blank");
                }} className="w-full py-2 rounded-[var(--radius-xs)] text-xs font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition flex items-center justify-center gap-1.5">
                  📕 分享到小红书（复制文案并跳转）
                </button>
                {shareToast && <div className="text-xs text-green-600 text-center">已复制到剪贴板，正在跳转小红书...</div>}
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
                      <text x="50" y="46" textAnchor="middle" className="text-2xl font-bold font-mono" fill="currentColor" fontSize="22">{jdMatchResult.matchScore}</text>
                      <text x="50" y="62" textAnchor="middle" fill="#94a3b8" fontSize="10">匹配度</text>
                    </svg>
                  </div>
                  <div className="flex-1 space-y-2.5">
                    <h3 className="text-sm font-bold text-gray-900">模块分析</h3>
                    {jdMatchResult.modules.map((m) => (
                      <div key={m.name} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-700 font-medium">{m.name}</span>
                          <span className={`text-xs font-bold font-mono ${m.score >= 80 ? "text-green-600" : m.score >= 60 ? "text-amber-600" : "text-red-500"}`}>{m.score}</span>
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
                        <span className="shrink-0 w-5 h-5 rounded-full bg-brand-50 text-brand-500 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
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
                    <div key={r.rank} className="p-4 rounded-[var(--radius-xs)] border border-[var(--border)] bg-[var(--surface-solid)] flex items-start gap-4">
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
                          <span className="text-xs font-bold font-mono text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded">#{r.rank}</span>
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
                <div className="p-4 rounded-[var(--radius-xs)] bg-brand-50">
                  <div className="text-xs font-bold text-brand-500 mb-1">投递策略</div>
                  <div className="text-xs text-brand-500">{jdCompareResult.strategy}</div>
                </div>
                <div className="text-xs text-gray-500"><strong>时间规划：</strong>{jdCompareResult.timeline}</div>
                <button onClick={() => {
                  navigator.clipboard.writeText(formatForXiaohongshu(jdCompareResult, jdCards));
                  setShareToast(true); setTimeout(() => setShareToast(false), 2000);
                  window.open("https://www.xiaohongshu.com/explore", "_blank");
                }} className="w-full py-2 rounded-[var(--radius-xs)] text-xs font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition flex items-center justify-center gap-1.5">
                  📕 分享到小红书（复制文案并跳转）
                </button>
                {shareToast && <div className="text-xs text-green-600 text-center">已复制到剪贴板，正在跳转小红书...</div>}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
