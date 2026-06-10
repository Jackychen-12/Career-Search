"use client";

import { useEffect, useState } from "react";
import { loadTracking, saveTracking, removeTracking, type TrackingData, type TrackingEntry, type TrackingStatus } from "@/lib/tracker";
import { syncTrackingToInterview, interviewToTrackingStatus } from "@/lib/sync";
import { getSession } from "@/lib/auth";
import type { Job } from "@/lib/types";
import type { InterviewRecord } from "@/lib/interviews";
import { loadInterviews } from "@/lib/interviews";
import type * as XLSXType from "xlsx";

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

interface UnifiedItem {
  id: string;
  company: string;
  title: string;
  location: string;
  jobType: string;
  status: TrackingStatus;
  entry: TrackingEntry;
  applyUrl?: string;
  job?: Job;
  interview?: InterviewRecord;
  isInterviewOnly: boolean;
}

type ViewTab = "table" | "timeline" | "kanban";

interface Props {
  jobs: Job[];
  hideHeader?: boolean;
  interviews?: InterviewRecord[];
  syncVersion?: number;
  onSyncChange?: () => void;
  onTrackingLoaded?: (data: TrackingData) => void;
}

export default function TrackingPageClient({ jobs, hideHeader, interviews: interviewsProp, syncVersion, onSyncChange, onTrackingLoaded }: Props) {
  const [tracking, setTracking] = useState<TrackingData>({});
  const [localInterviews, setLocalInterviews] = useState<InterviewRecord[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState<ViewTab>("table");
  const [editId, setEditId] = useState<string | null>(null);

  const interviews = interviewsProp && interviewsProp.length > 0 ? interviewsProp : localInterviews;

  useEffect(() => {
    getSession().then((s) => {
      setLoggedIn(!!s);
      if (s) {
        loadTracking().then((data) => {
          setTracking(data);
          onTrackingLoaded?.(data);
        });
        loadInterviews().then(setLocalInterviews);
      }
    });
  }, []);

  useEffect(() => {
    if (syncVersion && syncVersion > 0) {
      loadTracking().then((data) => {
        setTracking(data);
        onTrackingLoaded?.(data);
      });
      loadInterviews().then(setLocalInterviews);
    }
  }, [syncVersion]);

  // Build unified items from tracking + interviews
  const items: UnifiedItem[] = (() => {
    const result: UnifiedItem[] = [];
    const usedInterviewIds = new Set<string>();

    // 1. Start with tracking entries
    for (const [id, entry] of Object.entries(tracking)) {
      const job = jobs.find((j) => j.id === id);
      if (!job) continue;

      const linked = interviews?.find((iv) => iv.relatedJobId === id);
      if (linked) usedInterviewIds.add(linked.id);

      const mappedStatus = linked ? interviewToTrackingStatus(linked.status) : entry.status;
      const effectiveStatus = STATUS_CONFIG[mappedStatus].order > STATUS_CONFIG[entry.status].order ? mappedStatus : entry.status;

      result.push({
        id,
        company: job.company,
        title: job.title,
        location: job.location[0] ?? "",
        jobType: job.jobType,
        status: effectiveStatus,
        entry,
        applyUrl: job.applyUrl,
        job,
        interview: linked,
        isInterviewOnly: false,
      });
    }

    // 2. Add interview records not linked to any tracking entry
    if (interviews) {
      for (const iv of interviews) {
        if (usedInterviewIds.has(iv.id)) continue;
        if (iv.relatedJobId && tracking[iv.relatedJobId]) continue;

        const mappedStatus = interviewToTrackingStatus(iv.status);

        // Check if there's a job in the database for this relatedJobId
        const job = iv.relatedJobId ? jobs.find((j) => j.id === iv.relatedJobId) : undefined;

        result.push({
          id: `iv-${iv.id}`,
          company: job?.company ?? iv.company,
          title: job?.title ?? iv.position,
          location: job?.location[0] ?? "",
          jobType: job?.jobType ?? "",
          status: mappedStatus,
          entry: {
            status: mappedStatus,
            updatedAt: iv.updatedAt,
            interviewAt: iv.rounds[0]?.date,
            channel: iv.channel,
            salary: iv.salaryInfo,
            notes: iv.notes,
          },
          applyUrl: job?.applyUrl,
          job,
          interview: iv,
          isInterviewOnly: true,
        });
      }
    }

    return result.sort((a, b) => b.entry.updatedAt.localeCompare(a.entry.updatedAt));
  })();

  const counts: Record<string, number> = {};
  items.forEach((i) => { counts[i.status] = (counts[i.status] ?? 0) + 1; });

  async function updateEntry(itemId: string, patch: Partial<TrackingEntry>) {
    if (itemId.startsWith("iv-")) return;
    const current = tracking[itemId];
    if (!current) return;
    const newStatus = patch.status ?? current.status;
    const updated = await saveTracking(itemId, newStatus, { ...current, ...patch });
    setTracking(updated);
    onTrackingLoaded?.(updated);
    await syncTrackingToInterview(itemId, newStatus);
    onSyncChange?.();
  }

  async function deleteEntry(itemId: string) {
    if (itemId.startsWith("iv-")) return;
    const updated = await removeTracking(itemId);
    setTracking(updated);
    setEditId(null);
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const data = items.map((t) => ({
      公司: t.company, 岗位: t.title, 状态: STATUS_CONFIG[t.status].label,
      优先级: t.entry.priority ?? "", 投递日期: t.entry.appliedAt ?? "", 面试日期: t.entry.interviewAt ?? "",
      渠道: t.entry.channel ?? "", 联系人: t.entry.contact ?? "", 薪资: t.entry.salary ?? "",
      备注: t.entry.notes ?? "", 城市: t.location, 链接: t.applyUrl ?? "",
      面试轮次: t.interview?.rounds.length ?? "",
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
    <div className={hideHeader ? "" : "min-h-screen"}>
      {!hideHeader && (
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
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {hideHeader && items.length > 0 && (
          <div className="flex justify-end">
            <button onClick={exportExcel} className="text-[13px] text-brand-600 hover:text-brand-700">导出 Excel</button>
          </div>
        )}
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
          <div className="card p-12 text-center text-gray-400">还没有追踪任何岗位，去首页点心形收藏或在面试记录中新增</div>
        ) : (
          <>
            {/* Table view */}
            {tab === "table" && (
              <div className="space-y-2">
                {items.map((t) => (
                  <div key={t.id} className="card overflow-hidden">
                    <div className="px-4 py-3 flex items-center gap-3 cursor-pointer" onClick={() => setEditId(editId === t.id ? null : t.id)}>
                      <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_CONFIG[t.status].bg} text-white`}>
                        {STATUS_CONFIG[t.status].label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {t.company} · {t.title}
                          {t.interview && <span className="text-[10px] text-amber-500 ml-1.5">({t.interview.rounds.length}轮面试)</span>}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {t.location && <>{t.location} · </>}{t.jobType}
                          {t.entry.appliedAt && ` · 投递于 ${t.entry.appliedAt.slice(0, 10)}`}
                          {t.interview?.nextInterviewAt && <span className="text-brand-600"> · 下次面试 {t.interview.nextInterviewAt.slice(5)}</span>}
                        </div>
                      </div>
                      {t.entry.priority && <span className={`text-[10px] font-medium ${t.entry.priority === "high" ? "text-red-600" : t.entry.priority === "medium" ? "text-amber-600" : "text-gray-400"}`}>{t.entry.priority === "high" ? "高" : t.entry.priority === "medium" ? "中" : "低"}</span>}
                      <span className="text-gray-300 text-xs">{editId === t.id ? "▲" : "▼"}</span>
                    </div>
                    {editId === t.id && !t.isInterviewOnly && (
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
                          {t.applyUrl && <a href={t.applyUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600">投递 →</a>}
                        </div>
                      </div>
                    )}
                    {editId === t.id && t.isInterviewOnly && t.interview && (
                      <div className="px-4 pb-4 pt-1 border-t border-gray-50 space-y-3">
                        <div className="text-[11px] text-gray-400">此记录来自面试记录，请切换到「面试记录」tab 编辑详情</div>
                        {t.interview.rounds.length > 0 && (
                          <div className="space-y-1.5">
                            {t.interview.rounds.map((round, rIdx) => (
                              <div key={round.id} className="bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-2 text-xs">
                                <span className="font-bold text-gray-600">{round.round || `第${rIdx + 1}轮`}</span>
                                <span className="text-gray-400">{round.date}</span>
                                {round.result && (
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                    round.result === "通过" ? "bg-green-100 text-green-700" :
                                    round.result === "挂了" ? "bg-red-100 text-red-700" :
                                    "bg-yellow-100 text-yellow-700"
                                  }`}>{round.result}</span>
                                )}
                                {round.feeling && <span className="text-gray-400">感受: {round.feeling}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        {t.interview.salaryInfo && <div className="text-xs text-gray-500">薪资: {t.interview.salaryInfo}</div>}
                        {t.interview.notes && <div className="text-xs text-gray-500">备注: {t.interview.notes}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Timeline view */}
            {tab === "timeline" && (() => {
              const STEPS: TrackingStatus[] = ["applied", "written", "interview", "hr", "offer"];
              const activeItems = items.filter((i) => i.status !== "saved");

              const groups: Record<string, UnifiedItem[]> = {};
              items.forEach((t) => {
                const date = t.entry.appliedAt ?? t.entry.updatedAt.slice(0, 10);
                const d = new Date(date);
                const weekStart = new Date(d);
                weekStart.setDate(d.getDate() - d.getDay());
                const key = weekStart.toISOString().slice(0, 10);
                if (!groups[key]) groups[key] = [];
                groups[key].push(t);
              });
              const sortedWeeks = Object.keys(groups).sort((a, b) => b.localeCompare(a));

              return (
                <div className="space-y-5">
                  {activeItems.length > 0 && (
                    <div className="card p-5">
                      <h4 className="text-xs font-bold text-gray-700 mb-3">进度甘特图</h4>
                      <div className="space-y-2.5">
                        {activeItems.map((t) => {
                          const cfg = STATUS_CONFIG[t.status];
                          const stepIdx = STEPS.indexOf(t.status);
                          const progress = stepIdx >= 0 ? ((stepIdx + 1) / STEPS.length) * 100 : t.status === "rejected" ? 100 : 10;
                          return (
                            <div key={t.id} className="flex items-center gap-3">
                              <span className="text-[11px] font-medium text-gray-700 w-20 truncate shrink-0">{t.company}</span>
                              <div className="flex-1 h-7 bg-gray-50 rounded-lg overflow-hidden relative border border-gray-100">
                                <div className={`h-full rounded-lg ${t.status === "rejected" ? "bg-red-400" : t.status === "withdrawn" ? "bg-gray-300" : cfg.bg} transition-all`} style={{ width: `${progress}%` }} />
                                <div className="absolute inset-0 flex items-center px-2.5">
                                  <span className="text-[10px] font-medium text-gray-600">{t.title}</span>
                                  <span className={`ml-auto text-[9px] font-bold ${progress > 50 ? "text-white" : cfg.color}`}>
                                    {cfg.label}
                                    {t.interview && ` · ${t.interview.rounds.length}轮`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                        {STEPS.map((s) => (
                          <div key={s} className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].bg}`} />
                            <span className="text-[10px] text-gray-500">{STATUS_CONFIG[s].label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sortedWeeks.map((weekKey) => {
                    const weekItems = groups[weekKey];
                    const weekDate = new Date(weekKey);
                    const weekLabel = `${weekDate.getMonth() + 1}月${weekDate.getDate()}日 - ${weekDate.getMonth() + 1}月${weekDate.getDate() + 6}日`;
                    return (
                      <div key={weekKey}>
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">{weekLabel}</div>
                        <div className="card overflow-hidden divide-y divide-gray-50">
                          {weekItems.map((t) => {
                            const cfg = STATUS_CONFIG[t.status];
                            return (
                              <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                                <div className={`shrink-0 w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                                  <span className="text-white text-[10px] font-bold">{cfg.label.slice(0, 1)}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-[13px] font-medium text-gray-900 truncate block">
                                    {t.company} · {t.title}
                                    {t.interview && <span className="text-[10px] text-amber-500 ml-1">({t.interview.rounds.length}轮)</span>}
                                  </span>
                                  <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2">
                                    <span className={cfg.color}>{cfg.label}</span>
                                    {t.entry.appliedAt && <span>投递 {t.entry.appliedAt.slice(5, 10)}</span>}
                                    {t.entry.interviewAt && <span>面试 {t.entry.interviewAt.slice(5, 10)}</span>}
                                    {t.entry.notes && <span className="truncate">· {t.entry.notes.slice(0, 15)}</span>}
                                  </div>
                                </div>
                                <span className="shrink-0 text-[10px] text-gray-300">{(t.entry.appliedAt ?? t.entry.updatedAt).slice(5, 10)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Kanban view */}
            {tab === "kanban" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {(["applied", "written", "interview", "hr", "offer", "rejected"] as TrackingStatus[]).map((status) => {
                  const cfg = STATUS_CONFIG[status];
                  const statusItems = items.filter((i) => i.status === status);
                  return (
                    <div key={status} className="space-y-2">
                      <div className="flex items-center gap-1.5 px-1">
                        <span className={`w-2 h-2 rounded-full ${cfg.bg}`} />
                        <span className="text-xs font-semibold text-gray-700">{cfg.label}</span>
                        <span className="text-[10px] text-gray-400">{statusItems.length}</span>
                      </div>
                      <div className="space-y-1.5">
                        {statusItems.map((t) => (
                          <div key={t.id} className="card p-2.5 block">
                            <div className="text-xs font-medium text-gray-900 line-clamp-1">{t.company}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{t.title}</div>
                            {t.interview && (
                              <div className="text-[9px] text-amber-500 mt-0.5">{t.interview.rounds.length}轮面试</div>
                            )}
                          </div>
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
