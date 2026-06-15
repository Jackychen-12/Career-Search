"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { loadInterviews, saveInterview, updateInterview, deleteInterview } from "@/lib/interviews";
import type { InterviewRecord, InterviewStatus } from "@/lib/interviews";
import { getSession } from "@/lib/auth";
import { syncInterviewToTracking } from "@/lib/sync";
import type { Job } from "@/lib/types";
import type { TrackingData } from "@/lib/tracker";
import InterviewForm from "./InterviewForm";
import type { TrackedJobOption } from "./InterviewForm";

const DashboardClient = dynamic(() => import("./DashboardClient").then((m) => ({ default: m.DashboardClient })), { ssr: false });

const STATUS_CONFIG: Record<InterviewStatus, { label: string; color: string; bg: string }> = {
  "进行中":   { label: "进行中",   color: "text-blue-600",   bg: "bg-blue-500" },
  "已拿offer": { label: "已拿Offer", color: "text-brand-600", bg: "bg-brand-500" },
  "已拒":     { label: "已拒",     color: "text-red-500",    bg: "bg-red-400" },
  "已放弃":   { label: "已放弃",   color: "text-gray-400",   bg: "bg-gray-300" },
};

type FilterStatus = InterviewStatus | "all";

export default function InterviewPageClient({ hideHeader, jobs, tracking, syncVersion, onSyncChange, allInterviews }: { hideHeader?: boolean; jobs?: Job[]; tracking?: TrackingData; syncVersion?: number; onSyncChange?: () => void; allInterviews?: InterviewRecord[] } = {}) {
  const [records, setRecords] = useState<InterviewRecord[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<InterviewRecord | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [subView, setSubView] = useState<"records" | "data">("records");
  const hasDashboard = !!(tracking && allInterviews);

  useEffect(() => {
    getSession().then((s) => {
      setLoggedIn(!!s);
      loadInterviews().then((data) => {
        setRecords(data);
        setLoaded(true);
      });
    });
  }, []);

  useEffect(() => {
    if (syncVersion && syncVersion > 0) {
      loadInterviews().then(setRecords);
    }
  }, [syncVersion]);

  const trackedJobOptions: TrackedJobOption[] = (() => {
    if (!jobs || !tracking) return [];
    const linkedJobIds = new Set(records.map((r) => r.relatedJobId).filter(Boolean));
    const result: TrackedJobOption[] = [];
    for (const [jobId, entry] of Object.entries(tracking)) {
      if (linkedJobIds.has(jobId)) continue;
      const job = jobs.find((j) => j.id === jobId);
      if (job) result.push({ jobId, company: job.company, title: job.title, channel: entry.channel });
    }
    return result;
  })();

  const filtered = filter === "all" ? records : records.filter((r) => r.status === filter);
  const counts: Record<string, number> = {};
  records.forEach((r) => { counts[r.status] = (counts[r.status] ?? 0) + 1; });

  async function handleSave(data: Omit<InterviewRecord, "id" | "createdAt" | "updatedAt">) {
    if (editRecord) {
      const updated = await updateInterview(editRecord.id, data);
      setRecords(updated);
      await syncInterviewToTracking(data.relatedJobId ?? editRecord.relatedJobId, data.status, data.rounds);
    } else {
      const updated = await saveInterview(data);
      setRecords(updated);
      await syncInterviewToTracking(data.relatedJobId, data.status, data.rounds);
    }
    setShowForm(false);
    setEditRecord(undefined);
    onSyncChange?.();
  }

  async function handleDelete(id: string) {
    const updated = await deleteInterview(id);
    setRecords(updated);
    setExpandedId(null);
  }

  function openEdit(record: InterviewRecord) {
    setEditRecord(record);
    setShowForm(true);
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={hideHeader ? "" : "min-h-screen"}>
      {!hideHeader && (
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/60 border-b border-black/5">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="text-[15px] font-bold text-gray-900 hover:text-brand-600 transition">← Career Search</a>
              <span className="text-gray-300">·</span>
              <span className="text-[14px] font-medium text-gray-700">面试记录</span>
            </div>
            <button
              onClick={() => { setEditRecord(undefined); setShowForm(true); }}
              className="px-3.5 py-1.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition"
            >
              + 新增记录
            </button>
          </div>
        </header>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {hideHeader && (
          <div className="flex items-center justify-between">
            {hasDashboard ? (
              <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-lg">
                <button onClick={() => setSubView("records")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${subView === "records" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  记录
                </button>
                <button onClick={() => setSubView("data")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${subView === "data" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  数据
                </button>
              </div>
            ) : <div />}
            <button
              onClick={() => { setEditRecord(undefined); setShowForm(true); }}
              className="px-3.5 py-1.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition"
            >
              + 新增记录
            </button>
          </div>
        )}

        {(subView === "records" || !hasDashboard) && (
          <>
        {/* 状态统计 */}
        <div className="flex flex-wrap gap-2">
          {(Object.entries(STATUS_CONFIG) as [InterviewStatus, typeof STATUS_CONFIG[InterviewStatus]][]).map(([key, cfg]) => {
            const count = counts[key] ?? 0;
            return (
              <button
                key={key}
                onClick={() => setFilter(filter === key ? "all" : key)}
                className={`card px-3 py-2 flex items-center gap-2 transition ${filter === key ? "ring-2 ring-brand-400" : ""}`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.bg}`} />
                <span className="text-sm font-bold text-gray-900">{count}</span>
                <span className="text-xs text-gray-500">{cfg.label}</span>
              </button>
            );
          })}
          <div className="card px-3 py-2 flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">{records.length}</span>
            <span className="text-xs text-gray-500">总计</span>
          </div>
        </div>

        {/* 列表 */}
        {filtered.length === 0 ? (
          <div className="card p-12 text-center text-gray-400">
            {records.length === 0 ? "还没有面试记录，点击右上角「+ 新增记录」开始" : "没有符合筛选条件的记录"}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((record) => {
              const cfg = STATUS_CONFIG[record.status];
              const lastRound = record.rounds[record.rounds.length - 1];
              const isExpanded = expandedId === record.id;

              return (
                <div key={record.id} className="card overflow-hidden">
                  <div
                    className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50/50 transition"
                    onClick={() => setExpandedId(isExpanded ? null : record.id)}
                  >
                    <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} text-white`}>
                      {cfg.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {record.company} · {record.position}
                        {record.department && <span className="text-gray-400 font-normal"> ({record.department})</span>}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2">
                        {lastRound && <span>{lastRound.round || "面试"} {lastRound.date.slice(5)}</span>}
                        {record.rounds.length > 0 && <span>共 {record.rounds.length} 轮</span>}
                        {record.nextInterviewAt && <span className="text-brand-600">下次: {record.nextInterviewAt.slice(5)}</span>}
                        {record.channel && <span>· {record.channel}</span>}
                      </div>
                    </div>
                    <span className="text-gray-300 text-xs">{isExpanded ? "▲" : "▼"}</span>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-50 space-y-4">
                      {/* 轮次详情 */}
                      {record.rounds.length > 0 && (
                        <div className="space-y-2">
                          {record.rounds.map((round, rIdx) => (
                            <div key={round.id} className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-700">{round.round || `第${rIdx + 1}轮`}</span>
                                <span className="text-[10px] text-gray-400">{round.date}</span>
                                {round.interviewer && <span className="text-[10px] text-gray-400">· {round.interviewer}</span>}
                                {round.duration && <span className="text-[10px] text-gray-400">· {round.duration}min</span>}
                                {round.result && (
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                    round.result === "通过" ? "bg-green-100 text-green-700" :
                                    round.result === "挂了" ? "bg-red-100 text-red-700" :
                                    "bg-yellow-100 text-yellow-700"
                                  }`}>{round.result}</span>
                                )}
                                {round.feeling && <span className="text-[10px] text-gray-400">感受: {round.feeling}</span>}
                              </div>
                              {round.questions.length > 0 && (
                                <div className="space-y-0.5">
                                  {round.questions.map((q, qIdx) => (
                                    <div key={qIdx} className="text-xs text-gray-600 flex gap-1.5">
                                      <span className="text-gray-300 shrink-0">{qIdx + 1}.</span>
                                      <span>{q}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {round.feedback && (
                                <div className="text-[11px] text-gray-500 italic mt-1">复盘: {round.feedback}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 综合信息 */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {record.salaryInfo && <div><span className="text-gray-400">薪资:</span> <span className="text-gray-700">{record.salaryInfo}</span></div>}
                        {record.offerDetail && <div><span className="text-gray-400">Offer:</span> <span className="text-gray-700">{record.offerDetail}</span></div>}
                        {record.nextPrepare && <div className="col-span-2"><span className="text-gray-400">准备:</span> <span className="text-gray-700">{record.nextPrepare}</span></div>}
                        {record.notes && <div className="col-span-2"><span className="text-gray-400">备注:</span> <span className="text-gray-700">{record.notes}</span></div>}
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <button onClick={() => handleDelete(record.id)} className="text-xs text-red-400 hover:text-red-600">删除</button>
                        <button onClick={() => openEdit(record)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">编辑</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loggedIn && records.length > 0 && (
          <div className="text-center text-[11px] text-gray-400 py-2">
            未登录，数据仅保存在本地浏览器
          </div>
        )}
          </>
        )}

        {subView === "data" && hasDashboard && (
          <DashboardClient tracking={tracking!} interviews={allInterviews!} />
        )}
      </main>

      {/* 表单 Modal */}
      {showForm && (
        <InterviewForm
          initial={editRecord}
          trackedJobs={trackedJobOptions}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditRecord(undefined); }}
        />
      )}
    </div>
  );
}
