"use client";

import { useState } from "react";
import type { Job } from "@/lib/types";
import type { TrackingData, TrackingEntry, TrackingStatus } from "@/lib/tracker";
import { saveTracking, removeTracking } from "@/lib/tracker";
import * as XLSX from "xlsx";

const STATUS_CONFIG: Record<TrackingStatus, { label: string; color: string; bg: string }> = {
  saved: { label: "收藏", color: "text-gray-700", bg: "bg-gray-100" },
  applied: { label: "已投递", color: "text-blue-700", bg: "bg-blue-50" },
  written: { label: "笔试", color: "text-indigo-700", bg: "bg-indigo-50" },
  interview: { label: "面试", color: "text-amber-700", bg: "bg-amber-50" },
  hr: { label: "HR面", color: "text-orange-700", bg: "bg-orange-50" },
  offer: { label: "Offer", color: "text-brand-700", bg: "bg-brand-50" },
  rejected: { label: "已拒", color: "text-red-600", bg: "bg-red-50" },
  withdrawn: { label: "放弃", color: "text-gray-500", bg: "bg-gray-50" },
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: "高", color: "text-red-600" },
  medium: { label: "中", color: "text-amber-600" },
  low: { label: "低", color: "text-gray-500" },
};

type SortField = "status" | "updatedAt" | "company" | "priority";

export default function TrackingPanel({
  open,
  onClose,
  tracking,
  jobs,
  onUpdate,
}: {
  open: boolean;
  onClose: () => void;
  tracking: TrackingData;
  jobs: Job[];
  onUpdate: (data: TrackingData) => void;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortField>("updatedAt");
  const [filterStatus, setFilterStatus] = useState<TrackingStatus | "all">("all");

  if (!open) return null;

  const trackedJobs = Object.entries(tracking)
    .map(([id, entry]) => ({ id, job: jobs.find((j) => j.id === id), entry }))
    .filter((x): x is { id: string; job: Job; entry: TrackingEntry } => !!x.job);

  const filtered = filterStatus === "all" ? trackedJobs : trackedJobs.filter((t) => t.entry.status === filterStatus);

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "company") return a.job.company.localeCompare(b.job.company);
    if (sortBy === "priority") {
      const order = { high: 0, medium: 1, low: 2, undefined: 3 };
      return (order[a.entry.priority as keyof typeof order] ?? 3) - (order[b.entry.priority as keyof typeof order] ?? 3);
    }
    if (sortBy === "status") {
      const order = Object.keys(STATUS_CONFIG);
      return order.indexOf(a.entry.status) - order.indexOf(b.entry.status);
    }
    return b.entry.updatedAt.localeCompare(a.entry.updatedAt);
  });

  async function updateEntry(jobId: string, patch: Partial<TrackingEntry>) {
    const current = tracking[jobId];
    if (!current) return;
    const updated = await saveTracking(jobId, patch.status ?? current.status, {
      ...current,
      ...patch,
    });
    onUpdate(updated);
  }

  async function deleteEntry(jobId: string) {
    const updated = await removeTracking(jobId);
    onUpdate(updated);
    setEditId(null);
  }

  function exportExcel() {
    const data = sorted.map((t) => ({
      公司: t.job.company,
      岗位: t.job.title,
      状态: STATUS_CONFIG[t.entry.status].label,
      优先级: t.entry.priority ? PRIORITY_LABELS[t.entry.priority].label : "",
      投递日期: t.entry.appliedAt?.slice(0, 10) ?? "",
      面试日期: t.entry.interviewAt?.slice(0, 10) ?? "",
      Offer日期: t.entry.offerAt?.slice(0, 10) ?? "",
      投递渠道: t.entry.channel ?? "",
      联系人: t.entry.contact ?? "",
      薪资: t.entry.salary ?? "",
      备注: t.entry.notes ?? "",
      城市: t.job.location.join("/"),
      类型: t.job.jobType,
      截止日期: t.job.deadline?.slice(0, 10) ?? "滚动",
      投递链接: t.job.applyUrl,
      更新时间: t.entry.updatedAt.slice(0, 10),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "投递记录");
    XLSX.writeFile(wb, "投递记录.xlsx");
  }

  // Status counts
  const counts: Record<string, number> = {};
  trackedJobs.forEach((t) => { counts[t.entry.status] = (counts[t.entry.status] ?? 0) + 1; });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-3xl sm:rounded-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-900">投递追踪</h3>
            <p className="text-xs text-gray-500 mt-0.5">{trackedJobs.length} 条记录</p>
          </div>
          <div className="flex items-center gap-2">
            {trackedJobs.length > 0 && (
              <button onClick={exportExcel} className="text-xs text-brand-600 hover:text-brand-700 font-medium">导出 Excel</button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none ml-2">×</button>
          </div>
        </div>

        {/* Status filter pills */}
        <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-1.5 overflow-x-auto shrink-0">
          <button
            onClick={() => setFilterStatus("all")}
            className={`shrink-0 px-2.5 py-1 rounded-full text-xs transition ${filterStatus === "all" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}
          >
            全部 {trackedJobs.length}
          </button>
          {(Object.entries(STATUS_CONFIG) as [TrackingStatus, typeof STATUS_CONFIG[TrackingStatus]][]).map(([key, cfg]) => {
            const c = counts[key] ?? 0;
            if (c === 0) return null;
            return (
              <button
                key={key}
                onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-xs transition ${filterStatus === key ? "bg-gray-900 text-white" : `${cfg.bg} ${cfg.color}`}`}
              >
                {cfg.label} {c}
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {sorted.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              {trackedJobs.length === 0 ? "点击岗位卡片上的心形按钮开始追踪" : "当前筛选无结果"}
            </div>
          ) : (
            <div className="space-y-2">
              {sorted.map((t) => (
                <div key={t.id} className="rounded-lg border border-gray-100 hover:border-gray-200 transition">
                  {/* Row summary */}
                  <div
                    className="px-4 py-3 flex items-center gap-3 cursor-pointer"
                    onClick={() => setEditId(editId === t.id ? null : t.id)}
                  >
                    <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_CONFIG[t.entry.status].bg} ${STATUS_CONFIG[t.entry.status].color}`}>
                      {STATUS_CONFIG[t.entry.status].label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{t.job.company} · {t.job.title}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {t.job.location[0]} · {t.job.jobType}
                        {t.entry.appliedAt && ` · 投递于 ${t.entry.appliedAt.slice(0, 10)}`}
                        {t.entry.notes && ` · ${t.entry.notes.slice(0, 20)}`}
                      </div>
                    </div>
                    {t.entry.priority && (
                      <span className={`shrink-0 text-[10px] font-medium ${PRIORITY_LABELS[t.entry.priority].color}`}>
                        {PRIORITY_LABELS[t.entry.priority].label}
                      </span>
                    )}
                    <span className="shrink-0 text-gray-300 text-xs">{editId === t.id ? "▲" : "▼"}</span>
                  </div>

                  {/* Expanded edit form */}
                  {editId === t.id && (
                    <div className="px-4 pb-4 pt-1 border-t border-gray-50 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-0.5">状态</label>
                          <select
                            value={t.entry.status}
                            onChange={(e) => updateEntry(t.id, { status: e.target.value as TrackingStatus })}
                            className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200"
                          >
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-0.5">优先级</label>
                          <select
                            value={t.entry.priority ?? ""}
                            onChange={(e) => updateEntry(t.id, { priority: (e.target.value || undefined) as TrackingEntry["priority"] })}
                            className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200"
                          >
                            <option value="">未设置</option>
                            <option value="high">高</option>
                            <option value="medium">中</option>
                            <option value="low">低</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-0.5">投递日期</label>
                          <input
                            type="date"
                            value={t.entry.appliedAt?.slice(0, 10) ?? ""}
                            onChange={(e) => updateEntry(t.id, { appliedAt: e.target.value || undefined })}
                            className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-0.5">面试日期</label>
                          <input
                            type="date"
                            value={t.entry.interviewAt?.slice(0, 10) ?? ""}
                            onChange={(e) => updateEntry(t.id, { interviewAt: e.target.value || undefined })}
                            className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-0.5">投递渠道</label>
                          <input
                            value={t.entry.channel ?? ""}
                            onChange={(e) => updateEntry(t.id, { channel: e.target.value || undefined })}
                            placeholder="如：官网/牛客/内推"
                            className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-0.5">联系人/HR</label>
                          <input
                            value={t.entry.contact ?? ""}
                            onChange={(e) => updateEntry(t.id, { contact: e.target.value || undefined })}
                            placeholder="姓名/微信"
                            className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-0.5">薪资</label>
                          <input
                            value={t.entry.salary ?? ""}
                            onChange={(e) => updateEntry(t.id, { salary: e.target.value || undefined })}
                            placeholder="如：15-25K"
                            className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5">备注</label>
                        <textarea
                          value={t.entry.notes ?? ""}
                          onChange={(e) => updateEntry(t.id, { notes: e.target.value || undefined })}
                          placeholder="面试反馈、注意事项..."
                          rows={2}
                          className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200 resize-none"
                        />
                      </div>
                      <div className="flex justify-between">
                        <button onClick={() => deleteEntry(t.id)} className="text-xs text-red-500 hover:text-red-700">
                          删除记录
                        </button>
                        <a href={t.job.applyUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:text-brand-700">
                          前往投递 →
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
