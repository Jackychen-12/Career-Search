"use client";

import { useMemo } from "react";
import { computeProfileMatchDetailed } from "@/lib/matchScore";
import { daysUntil } from "@/lib/scoring";
import { hasPrefs } from "@/lib/ranking";
import type { Job, Prefs } from "@/lib/types";
import type { TrackingData } from "@/lib/tracker";
import type * as XLSXType from "xlsx";

interface PlanItem {
  job: Job;
  score: number;
  reasons: string[];
  daysLeft: number | null;
  urgency: "thisWeek" | "nextWeek" | "thisMonth" | "later";
}

function getUrgency(daysLeft: number | null): PlanItem["urgency"] {
  if (daysLeft === null) return "later";
  if (daysLeft <= 7) return "thisWeek";
  if (daysLeft <= 14) return "nextWeek";
  if (daysLeft <= 30) return "thisMonth";
  return "later";
}

const URGENCY_LABELS: Record<PlanItem["urgency"], { label: string; color: string }> = {
  thisWeek: { label: "本周截止", color: "text-red-500" },
  nextWeek: { label: "下周截止", color: "text-amber-500" },
  thisMonth: { label: "本月截止", color: "text-brand-500" },
  later: { label: "暂无紧迫", color: "text-[var(--text-t)]" },
};

export default function WeeklyPlan({
  open,
  onClose,
  jobs,
  prefs,
  tracking,
}: {
  open: boolean;
  onClose: () => void;
  jobs: Job[];
  prefs: Prefs;
  tracking: TrackingData;
}) {
  const plan = useMemo(() => {
    if (!hasPrefs(prefs)) return [];

    const now = new Date();
    const items: PlanItem[] = [];

    const skipStatuses = new Set(["applied", "interview", "offer", "rejected", "withdrawn", "written", "hr"]);

    for (const job of jobs) {
      if (skipStatuses.has(tracking[job.id]?.status)) continue;

      let { score, reasons } = computeProfileMatchDetailed(job, prefs);

      // 大陆/香港优先，海外降权
      if (job.region === "海外" || job.category === "外企") {
        score *= 0.5;
      } else if (job.region === "香港") {
        score *= 0.9;
      }

      if (score < 0.15) continue;

      const dl = daysUntil(job.deadline, now);
      if (dl !== null && dl < 0) continue;

      items.push({ job, score, reasons, daysLeft: dl, urgency: getUrgency(dl) });
    }

    items.sort((a, b) => {
      const urgencyOrder = { thisWeek: 0, nextWeek: 1, thisMonth: 2, later: 3 };
      const uDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (uDiff !== 0) return uDiff;
      return b.score - a.score;
    });

    return items.slice(0, 20);
  }, [jobs, prefs, tracking]);

  if (!open) return null;

  const grouped = {
    thisWeek: plan.filter((p) => p.urgency === "thisWeek"),
    nextWeek: plan.filter((p) => p.urgency === "nextWeek"),
    thisMonth: plan.filter((p) => p.urgency === "thisMonth"),
    later: plan.filter((p) => p.urgency === "later"),
  };

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const data = plan.map((p) => ({
      优先级: URGENCY_LABELS[p.urgency].label,
      公司: p.job.company,
      岗位: p.job.title,
      匹配度: `${Math.round(p.score * 100)}%`,
      匹配理由: p.reasons.join("; "),
      城市: p.job.location.join("/"),
      截止日期: p.job.deadline?.slice(0, 10) ?? "滚动",
      剩余天数: p.daysLeft ?? "—",
      投递链接: p.job.applyUrl,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "本周投递清单");
    XLSX.writeFile(wb, "本周投递清单.xlsx");
  }

  function copyText() {
    const lines = plan.map((p, i) =>
      `${i + 1}. ${p.job.company} - ${p.job.title} | 匹配${Math.round(p.score * 100)}% | 截止${p.job.deadline?.slice(0, 10) ?? "滚动"} | ${p.job.applyUrl}`
    );
    navigator.clipboard.writeText(lines.join("\n")).then(() => alert("已复制到剪贴板"));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-[var(--surface-solid)] w-full sm:max-w-2xl sm:rounded-[var(--radius-sm)] max-h-[88vh] flex flex-col border border-[var(--border)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-[var(--text)]">本周投递清单</h3>
            <p className="text-xs text-[var(--text-s)] mt-0.5">基于画像自动筛选，按紧急度排序，已投递的已排除</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-t)] hover:text-[var(--text)] text-xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {plan.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--text-t)]">
              {hasPrefs(prefs) ? "没有符合条件的待投递岗位" : "请先设置求职画像"}
            </div>
          ) : (
            <div className="space-y-5">
              {(Object.entries(grouped) as [PlanItem["urgency"], PlanItem[]][]).map(([key, items]) => {
                if (items.length === 0) return null;
                const { label, color } = URGENCY_LABELS[key];
                return (
                  <div key={key}>
                    <h4 className={`text-xs font-bold ${color} mb-2 flex items-center gap-1.5`}>
                      <span className="w-1 h-4 rounded-full bg-current opacity-50" />
                      {label}（{items.length}）
                    </h4>
                    <div className="space-y-1.5">
                      {items.map((p) => (
                        <a
                          key={p.job.id}
                          href={p.job.applyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 p-3 rounded-[var(--radius-xs)] border border-[var(--border)] hover:border-brand-300 transition"
                        >
                          <span className={`shrink-0 text-[11px] font-bold px-2 py-1 rounded-full ${
                            p.score > 0.6 ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-500"
                          }`}>
                            {Math.round(p.score * 100)}%
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[var(--text)]">{p.job.company} · {p.job.title}</div>
                            <div className="text-[11px] text-[var(--text-s)] mt-0.5">
                              {p.reasons.slice(0, 2).join(" · ")}
                              {p.daysLeft !== null && <span className="ml-2 text-[var(--text-t)]">剩{p.daysLeft}天</span>}
                            </div>
                          </div>
                          <span className="shrink-0 text-xs text-[var(--text-t)]">{p.job.location[0]}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {plan.length > 0 && (
          <div className="px-5 py-3 border-t border-[var(--border)] flex items-center gap-2 shrink-0">
            <button onClick={copyText} className="flex-1 py-2 rounded-[var(--radius-xs)] text-sm border border-[var(--border-s)] text-[var(--text)] hover:border-[var(--border-s)] transition">
              复制清单
            </button>
            <button onClick={exportExcel} className="flex-1 py-2 rounded-[var(--radius-xs)] text-sm font-medium text-white bg-brand-500 hover:bg-brand-500 shadow-[var(--shadow-sm)] transition">
              导出 Excel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
