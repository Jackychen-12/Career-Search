"use client";

import { useEffect, useState } from "react";
import { loadTracking, saveTracking, removeTracking, type TrackingData, type TrackingEntry, type TrackingStatus } from "@/lib/tracker";
import { getSession } from "@/lib/auth";
import type { Job } from "@/lib/types";
import * as XLSX from "xlsx";

const STATUS_CONFIG: Record<TrackingStatus, { label: string; color: string; bg: string; order: number }> = {
  saved:     { label: "收藏",   color: "text-gray-600",  bg: "bg-gray-300",  order: 0 },
  applied:   { label: "已投递", color: "text-blue-600",  bg: "bg-blue-500",  order: 1 },
  written:   { label: "笔试",   color: "text-indigo-600",bg: "bg-indigo-500",order: 2 },
  interview: { label: "面试",   color: "text-amber-600", bg: "bg-amber-500", order: 3 },
  hr:        { label: "HR面",   color: "text-orange-600",bg: "bg-orange-500",order: 4 },
  offer:     { label: "Offer",  color: "text-brand-600", bg: "bg-brand-500", order: 5 },
  rejected:  { label: "已拒",   color: "text-red-500",   bg: "bg-red-400",   order: 6 },
  withdrawn: { label: "放弃",   color: "text-gray-400",  bg: "bg-gray-300",  order: 7 },
};

type ViewTab = "table" | "timeline" | "kanban";

export default function TrackingPageClient({ jobs }: { jobs: Job[] }) {
  const [tracking, setTracking] = useState<TrackingData>({});
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState<ViewTab>("table");
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    getSession().then((s) => {
      setLoggedIn(!!s);
      if (s) loadTracking().then(setTracking);
    });
  }, []);

  const items = Object.entries(tracking)
    .map(([id, entry]) => ({ id, job: jobs.find((j) => j.id === id), entry }))
    .filter((x): x is { id: string; job: Job; entry: TrackingEntry } => !!x.job)
    .sort((a, b) => b.entry.updatedAt.localeCompare(a.entry.updatedAt));

  const counts: Record<string, number> = {};
  items.forEach((i) => { counts[i.entry.status] = (counts[i.entry.status] ?? 0) + 1; });

  async function updateEntry(jobId: string, patch: Partial<TrackingEntry>) {
    const current = tracking[jobId];
    if (!current) return;
    const updated = await saveTracking(jobId, patch.status ?? current.status, { ...current, ...patch });
    setTracking(updated);
  }

  async function deleteEntry(jobId: string) {
    const updated = await removeTracking(jobId);
    setTracking(updated);
    setEditId(null);
  }

  function exportExcel() {
    const data = items.map((t) => ({
      公司: t.job.company, 岗位: t.job.title, 状态: STATUS_CONFIG[t.entry.status].label,
      优先级: t.entry.priority ?? "", 投递日期: t.entry.appliedAt ?? "", 面试日期: t.entry.interviewAt ?? "",
      渠道: t.entry.channel ?? "", 联系人: t.entry.contact ?? "", 薪资: t.entry.salary ?? "",
      备注: t.entry.notes ?? "", 城市: t.job.location.join("/"), 链接: t.job.applyUrl,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "投递记录");
    XLSX.writeFile(wb, "投递记录.xlsx");
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-12 text-center text-gray-400">请先登录查看投递管理</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/60 border-b border-black/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-[15px] font-bold text-gray-900 hover:text-brand-600 transition">← Career Search</a>
            <span className="text-gray-300">·</span>
            <span className="text-[14px] font-medium text-gray-700">投递管理</span>
          </div>
          <div className="flex items-center gap-3">
            {items.length > 0 && (
              <button onClick={exportExcel} className="text-[13px] text-brand-600 hover:text-brand-700">导出 Excel</button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Status summary */}
        <div className="flex flex-wrap gap-2">
          {(Object.entries(STATUS_CONFIG) as [TrackingStatus, typeof STATUS_CONFIG[TrackingStatus]][]).map(([key, cfg]) => {
            const count = counts[key] ?? 0;
            if (count === 0) return null;
            return (
              <div key={key} className="card px-3 py-2 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.bg}`} />
                <span className="text-sm font-bold text-gray-900">{count}</span>
                <span className="text-xs text-gray-500">{cfg.label}</span>
              </div>
            );
          })}
          {items.length > 0 && (
            <div className="card px-3 py-2 flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">{items.length}</span>
              <span className="text-xs text-gray-500">总计</span>
            </div>
          )}
        </div>

        {/* View tabs */}
        <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-lg w-fit">
          {([["table", "表格"], ["timeline", "时间线"], ["kanban", "看板"]] as [ViewTab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
              {label}
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="card p-12 text-center text-gray-400">还没有追踪任何岗位，去首页点心形收藏</div>
        ) : (
          <>
            {/* Table view */}
            {tab === "table" && (
              <div className="space-y-2">
                {items.map((t) => (
                  <div key={t.id} className="card overflow-hidden">
                    <div className="px-4 py-3 flex items-center gap-3 cursor-pointer" onClick={() => setEditId(editId === t.id ? null : t.id)}>
                      <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_CONFIG[t.entry.status].bg} text-white`}>
                        {STATUS_CONFIG[t.entry.status].label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{t.job.company} · {t.job.title}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {t.job.location[0]} · {t.job.jobType}
                          {t.entry.appliedAt && ` · 投递于 ${t.entry.appliedAt.slice(0, 10)}`}
                        </div>
                      </div>
                      {t.entry.priority && <span className={`text-[10px] font-medium ${t.entry.priority === "high" ? "text-red-600" : t.entry.priority === "medium" ? "text-amber-600" : "text-gray-400"}`}>{t.entry.priority === "high" ? "高" : t.entry.priority === "medium" ? "中" : "低"}</span>}
                      <span className="text-gray-300 text-xs">{editId === t.id ? "▲" : "▼"}</span>
                    </div>
                    {editId === t.id && (
                      <div className="px-4 pb-4 pt-1 border-t border-gray-50 space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div><label className="text-[10px] text-gray-400 block mb-0.5">状态</label>
                            <select value={t.entry.status} onChange={(e) => updateEntry(t.id, { status: e.target.value as TrackingStatus })} className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200">
                              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select></div>
                          <div><label className="text-[10px] text-gray-400 block mb-0.5">优先级</label>
                            <select value={t.entry.priority ?? ""} onChange={(e) => updateEntry(t.id, { priority: (e.target.value || undefined) as TrackingEntry["priority"] })} className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200">
                              <option value="">-</option><option value="high">高</option><option value="medium">中</option><option value="low">低</option>
                            </select></div>
                          <div><label className="text-[10px] text-gray-400 block mb-0.5">投递日期</label>
                            <input type="date" value={t.entry.appliedAt ?? ""} onChange={(e) => updateEntry(t.id, { appliedAt: e.target.value || undefined })} className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200" /></div>
                          <div><label className="text-[10px] text-gray-400 block mb-0.5">面试日期</label>
                            <input type="date" value={t.entry.interviewAt ?? ""} onChange={(e) => updateEntry(t.id, { interviewAt: e.target.value || undefined })} className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200" /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input value={t.entry.channel ?? ""} onChange={(e) => updateEntry(t.id, { channel: e.target.value || undefined })} placeholder="渠道" className="text-xs px-2 py-1.5 rounded-md border border-gray-200" />
                          <input value={t.entry.contact ?? ""} onChange={(e) => updateEntry(t.id, { contact: e.target.value || undefined })} placeholder="联系人" className="text-xs px-2 py-1.5 rounded-md border border-gray-200" />
                          <input value={t.entry.salary ?? ""} onChange={(e) => updateEntry(t.id, { salary: e.target.value || undefined })} placeholder="薪资" className="text-xs px-2 py-1.5 rounded-md border border-gray-200" />
                        </div>
                        <textarea value={t.entry.notes ?? ""} onChange={(e) => updateEntry(t.id, { notes: e.target.value || undefined })} placeholder="备注..." rows={2} className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200 resize-none" />
                        <div className="flex justify-between">
                          <button onClick={() => deleteEntry(t.id)} className="text-xs text-red-500">删除</button>
                          <a href={t.job.applyUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600">投递 →</a>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Timeline view */}
            {tab === "timeline" && (
              <div className="card p-5">
                <div className="relative">
                  <div className="absolute left-[15px] top-0 bottom-0 w-px bg-gray-200" />
                  <div className="space-y-5">
                    {items.map((t) => {
                      const cfg = STATUS_CONFIG[t.entry.status];
                      return (
                        <div key={t.id} className="flex items-start gap-4 relative">
                          <div className={`shrink-0 w-[31px] h-[31px] rounded-full ${cfg.bg} flex items-center justify-center z-10 ring-4 ring-white`}>
                            <span className="text-white text-[9px] font-bold">{cfg.label.slice(0, 1)}</span>
                          </div>
                          <div className="flex-1 min-w-0 card p-3">
                            <div className="flex items-center justify-between">
                              <a href={`/job/${t.id}`} className="text-sm font-medium text-gray-900 hover:text-brand-600">{t.job.company} · {t.job.title}</a>
                              <span className={`text-[10px] font-medium ${cfg.color}`}>{cfg.label}</span>
                            </div>
                            <div className="text-[11px] text-gray-400 mt-1">
                              {t.entry.appliedAt && `投递 ${t.entry.appliedAt.slice(0, 10)}`}
                              {t.entry.interviewAt && ` → 面试 ${t.entry.interviewAt.slice(0, 10)}`}
                              {!t.entry.appliedAt && `更新于 ${t.entry.updatedAt.slice(0, 10)}`}
                            </div>
                            {t.entry.notes && <div className="text-[11px] text-gray-500 mt-1">{t.entry.notes}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Kanban view */}
            {tab === "kanban" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {(["applied", "written", "interview", "hr", "offer", "rejected"] as TrackingStatus[]).map((status) => {
                  const cfg = STATUS_CONFIG[status];
                  const statusItems = items.filter((i) => i.entry.status === status);
                  return (
                    <div key={status} className="space-y-2">
                      <div className="flex items-center gap-1.5 px-1">
                        <span className={`w-2 h-2 rounded-full ${cfg.bg}`} />
                        <span className="text-xs font-semibold text-gray-700">{cfg.label}</span>
                        <span className="text-[10px] text-gray-400">{statusItems.length}</span>
                      </div>
                      <div className="space-y-1.5">
                        {statusItems.map((t) => (
                          <a key={t.id} href={`/job/${t.id}`} className="card p-2.5 block hover:border-brand-300 transition">
                            <div className="text-xs font-medium text-gray-900 line-clamp-1">{t.job.company}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{t.job.title}</div>
                          </a>
                        ))}
                        {statusItems.length === 0 && <div className="text-[10px] text-gray-300 text-center py-4">空</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
