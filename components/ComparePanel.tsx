"use client";

import type { Job, Prefs } from "@/lib/types";
import { computeProfileMatchDetailed } from "@/lib/matchScore";
import { daysUntil } from "@/lib/scoring";
import { hasPrefs } from "@/lib/ranking";

export default function ComparePanel({
  open,
  jobs,
  prefs,
  onClose,
}: {
  open: boolean;
  jobs: Job[];
  prefs: Prefs | null;
  onClose: () => void;
}) {
  if (!open || jobs.length < 2) return null;

  const now = new Date();
  const matches = jobs.map((j) => prefs && hasPrefs(prefs) ? computeProfileMatchDetailed(j, prefs) : null);

  const allSkills = new Set<string>();
  jobs.forEach((j) => j.aiTags?.skills.forEach((s) => allSkills.add(s)));
  const userSkills = new Set([...(prefs?.skills ?? []), ...(prefs?.resumeKeywords ?? [])].map((s) => s.toLowerCase()));

  const rows: { label: string; values: (string | null)[]; highlight?: "best" | "warn" }[] = [
    { label: "公司", values: jobs.map((j) => j.company) },
    { label: "岗位", values: jobs.map((j) => j.title) },
    { label: "行业", values: jobs.map((j) => j.category) },
    { label: "类型", values: jobs.map((j) => j.jobType) },
    { label: "城市", values: jobs.map((j) => j.location.join(" / ")) },
    { label: "薪资", values: jobs.map((j) => j.salary ?? "—") },
    { label: "学历要求", values: jobs.map((j) => j.requirements ?? "—") },
    {
      label: "截止日期",
      values: jobs.map((j) => {
        if (!j.deadline) return "滚动招聘";
        const dl = daysUntil(j.deadline, now);
        return `${j.deadline.slice(0, 10)}${dl !== null && dl >= 0 ? ` (${dl}天)` : ""}`;
      }),
    },
    {
      label: "AI 匹配",
      values: matches.map((m) => m ? `${Math.round(m.score * 100)}%` : "未设画像"),
      highlight: "best",
    },
    {
      label: "匹配理由",
      values: matches.map((m) => m && m.reasons.length > 0 ? m.reasons.join("\n") : "—"),
    },
    {
      label: "所需技能",
      values: jobs.map((j) => j.aiTags?.skills.join(", ") ?? "—"),
    },
    {
      label: "AI 概括",
      values: jobs.map((j) => j.aiTags?.summary ?? "—"),
    },
  ];

  // Find best match index
  const scores = matches.map((m) => m?.score ?? 0);
  const bestIdx = scores.indexOf(Math.max(...scores));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-[var(--surface-solid)] w-full max-h-[85vh] rounded-t-[var(--radius)] sm:rounded-t-[var(--radius-sm)] overflow-hidden flex flex-col border border-[var(--border)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <h3 className="text-base font-bold text-[var(--text)]">岗位对比</h3>
          <button onClick={onClose} className="text-[var(--text-t)] hover:text-[var(--text)] text-xl">×</button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 text-xs text-[var(--text-t)] font-medium w-28 shrink-0 sticky left-0 bg-[var(--surface-solid)]">维度</th>
                {jobs.map((j, i) => (
                  <th key={j.id} className={`text-left px-4 py-3 min-w-[200px] ${i === bestIdx && scores[bestIdx] > 0 ? "bg-brand-50/50" : ""}`}>
                    <div className="text-sm font-bold text-[var(--text)]">{j.company}</div>
                    <div className="text-xs text-[var(--text-s)] font-normal mt-0.5 truncate">{j.title}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(2).map((row) => (
                <tr key={row.label} className="border-b border-[var(--border)] hover:bg-[var(--surface)]/50">
                  <td className="px-4 py-2.5 text-xs text-[var(--text-t)] font-medium sticky left-0 bg-[var(--surface-solid)]">{row.label}</td>
                  {row.values.map((val, i) => {
                    let cellClass = "px-4 py-2.5 text-xs text-[var(--text)] font-mono";
                    if (row.highlight === "best" && i === bestIdx && scores[bestIdx] > 0) {
                      cellClass += " text-brand-500 font-bold bg-brand-50/30";
                    }
                    return (
                      <td key={i} className={cellClass}>
                        {row.label === "所需技能" && val !== "—" ? (
                          <div className="flex flex-wrap gap-1">
                            {val!.split(", ").map((s) => (
                              <span key={s} className={`px-1.5 py-0.5 rounded-[var(--radius-xs)] text-[10px] ${userSkills.has(s.toLowerCase()) ? "bg-brand-100 text-brand-700 font-medium" : "bg-[rgba(0,0,0,0.04)] text-[var(--text-s)]"}`}>
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="whitespace-pre-line">{val}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer: recommendation */}
        {scores[bestIdx] > 0 && (
          <div className="px-5 py-3 border-t border-[var(--border)] bg-brand-50/30 shrink-0">
            <div className="text-xs text-brand-700">
              <strong>推荐：</strong>{jobs[bestIdx].company} 综合匹配度最高（{Math.round(scores[bestIdx] * 100)}%），
              {matches[bestIdx]!.reasons.length > 0 ? matches[bestIdx]!.reasons[0] : ""}。
              {jobs.some((j) => {
                const dl = daysUntil(j.deadline, now);
                return dl !== null && dl >= 0 && dl <= 7;
              }) && " 注意：有岗位 7 天内截止，优先投递。"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
