"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { loadTracking, saveTracking, removeTracking, type TrackingData, type TrackingEntry, type TrackingStatus } from "@/lib/tracker";
import { loadInterviews, saveInterview, updateInterview, deleteInterview } from "@/lib/interviews";
import type { InterviewRecord } from "@/lib/interviews";
import { syncTrackingToInterview, syncInterviewToTracking, interviewToTrackingStatus } from "@/lib/sync";
import { computeDashboardStats } from "@/lib/dashboardStats";
import { analyzeProgress, type ProgressAnalyzeResult } from "@/lib/skills";
import { getSession } from "@/lib/auth";
import type { Job } from "@/lib/types";
import InterviewForm from "./InterviewForm";
import type { TrackedJobOption } from "./InterviewForm";

const FunnelChart = dynamic(() => import("./charts/FunnelChart").then((m) => ({ default: m.FunnelChart })), { ssr: false });
const TrendChart = dynamic(() => import("./charts/TrendChart").then((m) => ({ default: m.TrendChart })), { ssr: false });
const InterviewCalendar = dynamic(() => import("./charts/InterviewCalendar").then((m) => ({ default: m.InterviewCalendar })), { ssr: false });

const STATUS_KEYS: TrackingStatus[] = ["applied", "written", "interview", "hr", "offer", "rejected", "withdrawn"];

const STATUS_CONFIG: Record<TrackingStatus, { label: string; color: string; bg: string; order: number; light: string; border: string; hex: string }> = {
  saved:     { label: "收藏",   color: "text-gray-600",   bg: "bg-gray-400",   order: 0, light: "bg-gray-50",    border: "border-l-gray-400",   hex: "#9ca3af" },
  applied:   { label: "已投递", color: "text-blue-600",   bg: "bg-blue-500",   order: 1, light: "bg-blue-50",    border: "border-l-blue-400",   hex: "#3b82f6" },
  written:   { label: "笔试",   color: "text-indigo-600", bg: "bg-indigo-500", order: 2, light: "bg-indigo-50",  border: "border-l-indigo-400", hex: "#6366f1" },
  interview: { label: "面试",   color: "text-amber-600",  bg: "bg-amber-500",  order: 3, light: "bg-amber-50",   border: "border-l-amber-400",  hex: "#f59e0b" },
  hr:        { label: "HR面",   color: "text-orange-600", bg: "bg-orange-500", order: 4, light: "bg-orange-50",  border: "border-l-orange-400", hex: "#ea580c" },
  offer:     { label: "Offer",  color: "text-green-600",  bg: "bg-green-500",  order: 5, light: "bg-green-50",   border: "border-l-green-500",  hex: "#22c55e" },
  rejected:  { label: "已拒",   color: "text-red-500",    bg: "bg-red-400",    order: 6, light: "bg-red-50",     border: "border-l-red-400",    hex: "#ef4444" },
  withdrawn: { label: "放弃",   color: "text-gray-400",   bg: "bg-gray-300",   order: 7, light: "bg-gray-50",    border: "border-l-gray-300",   hex: "#94a3b8" },
};

const KANBAN_COLS: TrackingStatus[] = ["applied", "written", "interview", "hr", "offer"];

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

interface TimelineEvent {
  date: string;
  type: string;
  status: TrackingStatus;
  company: string;
  title: string;
  itemId: string;
}

type MainTab = "all" | "saved";
type SubView = "kanban" | "timeline";

function getKanbanColumn(item: UnifiedItem): TrackingStatus {
  if (KANBAN_COLS.includes(item.status)) return item.status;
  if (item.interview && item.interview.rounds.length > 0) {
    const last = item.interview.rounds[item.interview.rounds.length - 1].round;
    if (last === "HR面") return "hr";
    if (last === "笔试") return "written";
    return "interview";
  }
  return "applied";
}

export default function TrackingAndInterviewPage({ jobs }: { jobs: Job[] }) {
  const [tracking, setTracking] = useState<TrackingData>({});
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>("all");
  const [subView, setSubView] = useState<SubView>("kanban");
  const [editId, setEditId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TrackingStatus | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<InterviewRecord | undefined>();
  const [aiAnalysis, setAiAnalysis] = useState<ProgressAnalyzeResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [overviewOpen, setOverviewOpen] = useState(true);
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [collapsedCols, setCollapsedCols] = useState<Set<TrackingStatus>>(new Set());

  useEffect(() => {
    getSession().then((s) => {
      setLoggedIn(!!s);
      if (s) {
        Promise.all([loadTracking(), loadInterviews()]).then(([t, i]) => {
          setTracking(t);
          setInterviews(i);
          setLoaded(true);
        });
      } else {
        setLoaded(true);
      }
    });
  }, []);

  const items = useMemo(() => {
    const result: UnifiedItem[] = [];
    const usedInterviewIds = new Set<string>();

    for (const [id, entry] of Object.entries(tracking)) {
      const job = jobs.find((j) => j.id === id);
      if (!job) continue;
      const linked = interviews.find((iv) => iv.relatedJobId === id);
      if (linked) usedInterviewIds.add(linked.id);
      const mappedStatus = linked ? interviewToTrackingStatus(linked.status, linked.rounds) : entry.status;
      const effectiveStatus = STATUS_CONFIG[mappedStatus].order > STATUS_CONFIG[entry.status].order ? mappedStatus : entry.status;
      result.push({
        id, company: job.company, title: job.title, location: job.location[0] ?? "", jobType: job.jobType,
        status: effectiveStatus, entry, applyUrl: job.applyUrl, job, interview: linked, isInterviewOnly: false,
      });
    }

    for (const iv of interviews) {
      if (usedInterviewIds.has(iv.id)) continue;
      if (iv.relatedJobId && tracking[iv.relatedJobId]) continue;
      const mappedStatus = interviewToTrackingStatus(iv.status, iv.rounds);
      const job = iv.relatedJobId ? jobs.find((j) => j.id === iv.relatedJobId) : undefined;
      result.push({
        id: `iv-${iv.id}`, company: job?.company ?? iv.company, title: job?.title ?? iv.position,
        location: job?.location[0] ?? "", jobType: job?.jobType ?? "", status: mappedStatus,
        entry: { status: mappedStatus, updatedAt: iv.updatedAt, interviewAt: iv.rounds[0]?.date, channel: iv.channel, salary: iv.salaryInfo, notes: iv.notes },
        applyUrl: job?.applyUrl, job, interview: iv, isInterviewOnly: true,
      });
    }

    return result.sort((a, b) => b.entry.updatedAt.localeCompare(a.entry.updatedAt));
  }, [tracking, interviews, jobs]);

  const activeItems = useMemo(() => items.filter((i) => i.status !== "saved"), [items]);
  const savedItems = useMemo(() => items.filter((i) => i.status === "saved"), [items]);

  const filteredItems = useMemo(() => {
    if (!statusFilter) return activeItems;
    return activeItems.filter((i) => i.status === statusFilter);
  }, [activeItems, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    activeItems.forEach((i) => { c[i.status] = (c[i.status] ?? 0) + 1; });
    return c;
  }, [activeItems]);

  const timelineEvents = useMemo(() => {
    const src = statusFilter ? filteredItems : activeItems;
    const events: TimelineEvent[] = [];
    for (const item of src) {
      if (item.entry.appliedAt) {
        events.push({ date: item.entry.appliedAt.slice(0, 10), type: "投递", status: "applied", company: item.company, title: item.title, itemId: item.id });
      }
      if (item.interview) {
        for (const round of item.interview.rounds) {
          if (round.date) {
            events.push({ date: round.date.slice(0, 10), type: round.round || "面试", status: item.status, company: item.company, title: item.title, itemId: item.id });
          }
        }
      }
      if (["offer", "rejected", "withdrawn"].includes(item.status)) {
        events.push({ date: item.entry.updatedAt.slice(0, 10), type: STATUS_CONFIG[item.status].label, status: item.status, company: item.company, title: item.title, itemId: item.id });
      }
      if (!item.entry.appliedAt && (!item.interview || item.interview.rounds.length === 0) && !["offer", "rejected", "withdrawn"].includes(item.status)) {
        events.push({ date: item.entry.updatedAt.slice(0, 10), type: STATUS_CONFIG[item.status].label, status: item.status, company: item.company, title: item.title, itemId: item.id });
      }
    }
    events.sort((a, b) => b.date.localeCompare(a.date));
    return events;
  }, [activeItems, filteredItems, statusFilter]);

  const groupedEvents = useMemo(() => {
    const groups: { date: string; events: TimelineEvent[] }[] = [];
    for (const e of timelineEvents) {
      const last = groups[groups.length - 1];
      if (last && last.date === e.date) {
        last.events.push(e);
      } else {
        groups.push({ date: e.date, events: [e] });
      }
    }
    return groups;
  }, [timelineEvents]);

  const trackedJobOptions: TrackedJobOption[] = useMemo(() => {
    const linkedJobIds = new Set(interviews.map((r) => r.relatedJobId).filter(Boolean));
    const result: TrackedJobOption[] = [];
    for (const [jobId, entry] of Object.entries(tracking)) {
      if (linkedJobIds.has(jobId)) continue;
      const job = jobs.find((j) => j.id === jobId);
      if (job) result.push({ jobId, company: job.company, title: job.title, channel: entry.channel });
    }
    return result;
  }, [tracking, interviews, jobs]);

  const stats = useMemo(() => computeDashboardStats(tracking, interviews), [tracking, interviews]);

  useEffect(() => {
    if (overviewOpen && !aiAnalysis && !aiLoading && loggedIn && (activeItems.length > 0 || Object.keys(tracking).length > 0)) {
      handleAnalyze();
    }
  }, [overviewOpen, loggedIn, activeItems.length]);

  async function updateEntry(itemId: string, patch: Partial<TrackingEntry>) {
    if (itemId.startsWith("iv-")) return;
    const current = tracking[itemId];
    if (!current) return;
    const newStatus = patch.status ?? current.status;
    if (newStatus !== "saved" && !current.appliedAt && !patch.appliedAt) {
      patch.appliedAt = new Date().toISOString().slice(0, 10);
    }
    const updated = await saveTracking(itemId, newStatus, { ...current, ...patch });
    setTracking(updated);
    await syncTrackingToInterview(itemId, newStatus);
    const freshInterviews = await loadInterviews();
    setInterviews(freshInterviews);
  }

  async function deleteEntry(itemId: string) {
    if (itemId.startsWith("iv-")) return;
    const updated = await removeTracking(itemId);
    setTracking(updated);
    setEditId(null);
  }

  async function handleInterviewSave(data: Omit<InterviewRecord, "id" | "createdAt" | "updatedAt">) {
    if (editRecord) {
      const updated = await updateInterview(editRecord.id, data);
      setInterviews(updated);
      await syncInterviewToTracking(data.relatedJobId ?? editRecord.relatedJobId, data.status, data.rounds);
    } else {
      const updated = await saveInterview(data);
      setInterviews(updated);
      await syncInterviewToTracking(data.relatedJobId, data.status, data.rounds);
    }
    const freshTracking = await loadTracking();
    setTracking(freshTracking);
    setShowForm(false);
    setEditRecord(undefined);
  }

  async function handleInterviewDelete(id: string) {
    const updated = await deleteInterview(id);
    setInterviews(updated);
    setEditId(null);
  }

  async function markAsApplied(itemId: string) {
    await updateEntry(itemId, { status: "applied" as TrackingStatus, appliedAt: new Date().toISOString().slice(0, 10) });
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const data = activeItems.map((t) => ({
      公司: t.company, 岗位: t.title, 状态: STATUS_CONFIG[t.status].label,
      优先级: t.entry.priority ?? "", 投递日期: t.entry.appliedAt ?? "", 面试日期: t.entry.interviewAt ?? "",
      渠道: t.entry.channel ?? "", 联系人: t.entry.contact ?? "", 薪资: t.entry.salary ?? "",
      备注: t.entry.notes ?? "", 城市: t.location, 链接: t.applyUrl ?? "",
      面试轮次: t.interview?.rounds.length ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "求职记录");
    XLSX.writeFile(wb, "求职记录.xlsx");
  }

  async function handleAnalyze() {
    setAiLoading(true);
    setAiError("");
    try {
      const lines = [
        `总投递 ${activeItems.length}，本周活跃 ${stats.weeklyActivity}`,
        `Offer 率 ${stats.offerRate}%，平均面试轮次 ${stats.avgRoundsToOffer || "无数据"}`,
        `状态分布：${STATUS_KEYS.map((k) => `${STATUS_CONFIG[k].label} ${counts[k] ?? 0}`).join("、")}`,
        `转化漏斗：${stats.conversionFunnel.map((s) => `${s.stage} ${s.count}(${s.rate}%)`).join(" → ")}`,
      ];
      const result = await analyzeProgress(lines.join("\n"));
      setAiAnalysis(result);
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setAiLoading(false);
    }
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center text-gray-300 text-xl">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </div>
          <p className="text-sm text-gray-500">请先登录查看求职管理</p>
        </div>
      </div>
    );
  }

  const mainTabs: { key: MainTab; label: string; count?: number }[] = [
    { key: "all", label: "全部记录", count: activeItems.length },
    { key: "saved", label: "收藏", count: savedItems.length },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/60 border-b border-black/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-[15px] font-bold text-gray-900 hover:text-brand-600 transition">← Career Search</a>
            <span className="text-gray-300">·</span>
            <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-lg">
              {mainTabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setMainTab(t.key); setStatusFilter(null); setEditId(null); }}
                  className={`px-3.5 py-1 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${mainTab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  {t.label}
                  {t.count !== undefined && t.count > 0 && <span className="text-xs text-gray-400">{t.count}</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {mainTab === "all" && (activeItems.length > 0 || Object.keys(tracking).length > 0) && (
              <button onClick={exportExcel} className="text-[13px] text-gray-500 hover:text-gray-700">导出 Excel</button>
            )}
            {mainTab === "all" && (
              <button
                onClick={() => { setEditRecord(undefined); setShowForm(true); }}
                className="px-3.5 py-1.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition"
              >
                + 新增记录
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ═══ Tab: 全部记录 ═══ */}
        {mainTab === "all" && (
          <>
            {/* Unified status chip bar */}
            {activeItems.length > 0 && (
              <div className="flex flex-wrap gap-2.5">
                {(["applied", "written", "interview", "hr", "offer", "rejected"] as TrackingStatus[]).map((key) => {
                  const cfg = STATUS_CONFIG[key];
                  const count = counts[key] ?? 0;
                  if (count === 0) return null;
                  return (
                    <button
                      key={key}
                      onClick={() => { setStatusFilter(statusFilter === key ? null : key); setTimelineExpanded(false); }}
                      className={`px-4 py-3 rounded-2xl flex items-center gap-2.5 transition border backdrop-blur-sm ${cfg.light} ${statusFilter === key ? "ring-2 ring-brand-400 border-transparent shadow-md scale-[1.02]" : "border-gray-200/60 hover:border-gray-300 hover:shadow-sm"}`}
                    >
                      <span className={`w-3 h-3 rounded-full ${cfg.bg} shadow-sm`} />
                      <span className="text-xl font-extrabold text-gray-900 tabular-nums">{count}</span>
                      <span className="text-sm text-gray-600 font-medium">{cfg.label}</span>
                    </button>
                  );
                })}
                <div className="px-4 py-3 rounded-2xl flex items-center gap-2.5 border border-gray-200/60 bg-gradient-to-r from-gray-50 to-white">
                  <span className="text-xl font-extrabold text-gray-900 tabular-nums">{activeItems.length}</span>
                  <span className="text-sm text-gray-600 font-medium">总计</span>
                </div>
              </div>
            )}

            {/* Sub view tabs */}
            <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-lg w-fit">
              {([["kanban", "看板"], ["timeline", "时间线"]] as [SubView, string][]).map(([key, label]) => (
                <button key={key} onClick={() => { setSubView(key); setEditId(null); setTimelineExpanded(false); }} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${subView === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                  {label}
                </button>
              ))}
            </div>

            {activeItems.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-brand-50 flex items-center justify-center text-brand-400 text-xl">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12h14" /></svg>
                </div>
                <p className="text-sm text-gray-500">还没有追踪任何岗位</p>
                <p className="text-xs text-gray-400 mt-1">去首页点心形收藏或点击「+ 新增记录」</p>
              </div>
            ) : (
              <>
                {/* ── Kanban View ── */}
                {subView === "kanban" && (
                  <div className="animate-fadeIn">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {KANBAN_COLS.map((colStatus) => {
                        const cfg = STATUS_CONFIG[colStatus];
                        const colItems = filteredItems.filter((i) => {
                          if (i.status === colStatus) return true;
                          if (i.status === "rejected" || i.status === "withdrawn") {
                            return getKanbanColumn(i) === colStatus;
                          }
                          return false;
                        });
                        const isCollapsed = collapsedCols.has(colStatus);
                        const toggleCol = () => {
                          setCollapsedCols((prev) => {
                            const next = new Set(prev);
                            if (next.has(colStatus)) next.delete(colStatus); else next.add(colStatus);
                            return next;
                          });
                        };
                        return (
                          <div key={colStatus} className="space-y-2">
                            <div
                              onClick={toggleCol}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer select-none ${cfg.light} hover:opacity-80 transition`}
                            >
                              <span className={`w-2.5 h-2.5 rounded-full ${cfg.bg}`} />
                              <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                              <span className="text-xs text-gray-500 ml-auto">{colItems.length}</span>
                              <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                            </div>
                            {!isCollapsed && (
                            <div className="space-y-1.5 min-h-[80px] max-h-[480px] overflow-y-auto pr-0.5">
                              {colItems.map((t) => {
                                const isEnded = t.status === "rejected" || t.status === "withdrawn";
                                return (
                                  <div
                                    key={t.id}
                                    onClick={() => setEditId(editId === t.id ? null : t.id)}
                                    className={`card p-4 cursor-pointer hover:ring-1 hover:ring-brand-200 transition border-l-[3px] ${STATUS_CONFIG[t.status].border} ${isEnded ? "opacity-50" : ""} ${editId === t.id ? "ring-2 ring-brand-400" : ""}`}
                                  >
                                    <div className={`text-sm font-semibold text-gray-900 line-clamp-1 ${isEnded ? "line-through" : ""}`}>{t.company}</div>
                                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{t.title}</div>
                                    {t.interview?.department && <div className="text-[11px] text-brand-600 mt-0.5">{t.interview.department}</div>}
                                    {t.entry.appliedAt && <div className="text-[11px] text-gray-400 mt-0.5">投递 {t.entry.appliedAt.slice(5)}</div>}
                                    {t.entry.channel && <div className="text-[11px] text-gray-400 mt-0.5">渠道: {t.entry.channel}</div>}
                                    {isEnded && <div className="text-[11px] text-red-400 mt-1">{STATUS_CONFIG[t.status].label}</div>}
                                    {t.interview && !isEnded && (
                                      <div className="text-[11px] text-amber-500 mt-1.5">{t.interview.rounds.length}轮面试</div>
                                    )}
                                    {t.interview?.nextInterviewAt && !isEnded && (
                                      <div className="text-[11px] text-brand-600 mt-0.5">下次 {t.interview.nextInterviewAt.slice(5)}</div>
                                    )}
                                    {t.entry.priority && !isEnded && (
                                      <div className={`text-[11px] mt-0.5 ${t.entry.priority === "high" ? "text-red-500" : t.entry.priority === "medium" ? "text-amber-500" : "text-gray-400"}`}>
                                        {t.entry.priority === "high" ? "高优" : t.entry.priority === "medium" ? "中优" : "低优"}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {colItems.length === 0 && <div className="text-xs text-gray-400 text-center py-6">空</div>}
                            </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Kanban detail panel */}
                    {editId && (() => {
                      const item = activeItems.find((i) => i.id === editId);
                      if (!item) return null;
                      return (
                        <div className="card p-5 space-y-4 border-2 border-brand-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CONFIG[item.status].bg} text-white`}>{STATUS_CONFIG[item.status].label}</span>
                                <span className="text-sm font-bold text-gray-900">{item.company} · {item.title}</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {item.interview?.department && <span className="text-brand-600 font-medium">{item.interview.department}</span>}
                                {item.interview?.department && (item.location || item.jobType) && <span> · </span>}
                                {item.location && <>{item.location} · </>}{item.jobType}
                                {item.entry.appliedAt && ` · 投递于 ${item.entry.appliedAt.slice(0, 10)}`}
                              </div>
                            </div>
                            <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
                          </div>

                          {item.interview && item.interview.rounds.length > 0 && (
                            <div className="space-y-1.5">
                              <div className="text-xs font-semibold text-gray-600">面试轮次</div>
                              {item.interview.rounds.map((round, rIdx) => (
                                <div key={round.id} className="bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-2 text-xs flex-wrap">
                                  <span className="font-bold text-gray-600">{round.round || `第${rIdx + 1}轮`}</span>
                                  <span className="text-gray-400">{round.date}</span>
                                  {round.result && (
                                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${round.result === "通过" ? "bg-green-100 text-green-700" : round.result === "挂了" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{round.result}</span>
                                  )}
                                  {round.feeling && <span className="text-gray-400">感受: {round.feeling}</span>}
                                  {round.interviewer && <span className="text-gray-400">· {round.interviewer}</span>}
                                </div>
                              ))}
                            </div>
                          )}

                          {(item.interview?.salaryInfo || item.entry.salary) && (
                            <div className="text-xs text-gray-500">薪资: {item.interview?.salaryInfo || item.entry.salary}</div>
                          )}
                          {(item.interview?.notes || item.entry.notes) && (
                            <div className="text-xs text-gray-500">备注: {item.interview?.notes || item.entry.notes}</div>
                          )}

                          <div className="flex items-center gap-3 pt-2 border-t border-gray-100 flex-wrap">
                            {!item.isInterviewOnly && (
                              <>
                                <select value={item.status} onChange={(e) => updateEntry(item.id, { status: e.target.value as TrackingStatus })} className="text-sm px-2 py-1.5 rounded-md border border-gray-200">
                                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                                <button onClick={() => deleteEntry(item.id)} className="text-xs text-red-400 hover:text-red-600">删除追踪</button>
                              </>
                            )}
                            {item.interview ? (
                              <button onClick={() => { setEditRecord(item.interview); setShowForm(true); }} className="text-xs text-brand-600 hover:text-brand-700 font-medium">编辑面试</button>
                            ) : (
                              <button onClick={() => { setEditRecord(undefined); setShowForm(true); }} className="text-xs text-brand-600 hover:text-brand-700 font-medium">添加面试</button>
                            )}
                            {item.isInterviewOnly && item.interview && (
                              <button onClick={() => handleInterviewDelete(item.interview!.id)} className="text-xs text-red-400 hover:text-red-600">删除记录</button>
                            )}
                            {item.job && <a href={`/job/${item.job.id}`} className="text-xs text-gray-500 hover:text-gray-700 ml-auto">详情 →</a>}
                            {item.applyUrl && <a href={item.applyUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600">投递 →</a>}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ── Timeline View ── */}
                {subView === "timeline" && (
                  <div className="animate-fadeIn">
                  <div className={`relative pl-8 ${!timelineExpanded && timelineEvents.length > 15 ? "max-h-[600px] overflow-hidden" : ""}`}>
                    <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-brand-300 via-gray-200 to-gray-100 rounded-full" />
                    {groupedEvents.length === 0 ? (
                      <div className="text-sm text-gray-400 text-center py-12">暂无时间线数据</div>
                    ) : (
                      <div className="space-y-6">
                        {groupedEvents.map((group, gIdx) => {
                          const d = new Date(group.date);
                          const dateLabel = `${d.getMonth() + 1}月${d.getDate()}日`;
                          const weekday = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
                          return (
                            <div key={group.date} className="relative">
                              <div className="absolute -left-8 top-0.5 w-[22px] h-[22px] rounded-full bg-white border-2 border-brand-400 flex items-center justify-center shadow-sm">
                                <div className={`w-2.5 h-2.5 rounded-full ${gIdx === 0 ? "bg-brand-500" : "bg-gray-300"}`} />
                              </div>
                              <div className="mb-2">
                                <span className="text-sm font-bold text-gray-700">{dateLabel}</span>
                                <span className="text-xs text-gray-400 ml-1.5">周{weekday}</span>
                                <span className="text-xs text-gray-300 ml-2">{group.date}</span>
                              </div>
                              <div className="space-y-1.5">
                                {group.events.map((event, idx) => {
                                  const evtStatus = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.applied;
                                  return (
                                    <div key={`${event.itemId}-${idx}`} className={`flex items-center gap-2.5 ${evtStatus.light} rounded-lg px-3.5 py-2.5 border border-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)]`}>
                                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${evtStatus.bg} text-white shrink-0`}>{event.type}</span>
                                      <span className="text-sm text-gray-900 font-medium truncate">{event.company}</span>
                                      <span className="text-xs text-gray-400">·</span>
                                      <span className="text-xs text-gray-500 truncate flex-1">{event.title}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {!timelineExpanded && timelineEvents.length > 15 && (
                    <div className="relative -mt-16 pt-16 bg-gradient-to-t from-white to-transparent flex justify-center pb-2">
                      <button
                        onClick={() => setTimelineExpanded(true)}
                        className="px-4 py-1.5 rounded-full bg-white border border-gray-200 text-sm text-gray-600 hover:text-brand-600 hover:border-brand-300 shadow-sm transition"
                      >
                        展开全部 ({timelineEvents.length} 条事件)
                      </button>
                    </div>
                  )}
                  </div>
                )}
              </>
            )}

            {/* ═══ 数据概览 ═══ */}
            {(activeItems.length > 0 || Object.keys(tracking).length > 0 || interviews.length > 0) && (
              <div className="border-t border-gray-200/60 pt-6">
                <button
                  onClick={() => setOverviewOpen(!overviewOpen)}
                  className="w-full flex items-center justify-between group"
                >
                  <h2 className="text-base font-semibold text-gray-800 group-hover:text-brand-600 transition">数据概览</h2>
                  <div className="flex items-center gap-3">
                    {!overviewOpen && (
                      <span className="text-xs text-gray-400 hidden sm:inline">
                        Offer率 {stats.offerRate}% · 本周活跃 {stats.weeklyActivity}
                      </span>
                    )}
                    <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${overviewOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                {overviewOpen && (
                  <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fadeIn">
                  {/* 左上：漏斗 */}
                  <div className="card p-5 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-700 mb-4">投递转化漏斗</h3>
                    <FunnelChart data={stats.conversionFunnel} />
                  </div>

                  {/* 右上：AI 分析 */}
                  <div className="card p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-gray-700">AI 投递分析</h3>
                      {aiAnalysis && (
                        <button onClick={handleAnalyze} className="text-[11px] text-brand-600 hover:text-brand-700 font-medium">重新分析</button>
                      )}
                    </div>
                    {aiLoading ? (
                      <div className="flex flex-col items-center justify-center h-44 gap-3">
                        <div className="w-7 h-7 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                        <span className="text-xs text-gray-400">AI 分析中...</span>
                      </div>
                    ) : aiError ? (
                      <div className="flex flex-col items-center justify-center h-44 gap-3">
                        <span className="text-xs text-red-500">{aiError}</span>
                        <button onClick={handleAnalyze} className="text-[11px] text-brand-600 hover:text-brand-700">重试</button>
                      </div>
                    ) : aiAnalysis ? (
                      <div className="space-y-3">
                        <p className="text-sm font-bold text-gray-900 leading-snug">{aiAnalysis.summary}</p>
                        <div>
                          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">数据洞察</div>
                          <ul className="space-y-1.5">
                            {aiAnalysis.insights.map((item, i) => (
                              <li key={i} className="text-[13px] text-gray-700 leading-relaxed flex gap-2"><span className="text-brand-500 shrink-0 mt-0.5">•</span><span>{item}</span></li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">行动建议</div>
                          <ul className="space-y-1.5">
                            {aiAnalysis.suggestions.map((item, i) => (
                              <li key={i} className="text-[13px] text-gray-700 leading-relaxed flex gap-2"><span className="text-green-500 shrink-0 mt-0.5">•</span><span>{item}</span></li>
                            ))}
                          </ul>
                        </div>
                        {aiAnalysis.riskWarnings.length > 0 && (
                          <div className="bg-red-50/60 rounded-lg p-3">
                            <div className="text-[11px] font-semibold text-red-600 uppercase tracking-wider mb-1.5">风险提醒</div>
                            <ul className="space-y-1">
                              {aiAnalysis.riskWarnings.map((item, i) => (
                                <li key={i} className="text-[13px] text-red-700 leading-relaxed flex gap-2"><span className="shrink-0">⚠</span><span>{item}</span></li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="pt-2.5 border-t border-gray-100">
                          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">下周计划</div>
                          <p className="text-[13px] text-gray-700 leading-relaxed">{aiAnalysis.weeklyPlan}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-44 gap-3">
                        <div className="w-11 h-11 rounded-full bg-brand-50 flex items-center justify-center">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5b4cff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2a7 7 0 0 1 7 7c0 2.4-1.2 4.5-3 5.7V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.3C6.2 13.5 5 11.4 5 9a7 7 0 0 1 7-7z" />
                            <line x1="9" y1="21" x2="15" y2="21" />
                          </svg>
                        </div>
                        <button onClick={handleAnalyze} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition shadow-sm">
                          生成 AI 分析
                        </button>
                        <p className="text-[11px] text-gray-400">基于你的求职数据生成个性化分析</p>
                      </div>
                    )}
                  </div>

                  {/* 左下：热力图 */}
                  <div className="card p-5 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-700 mb-4">求职活动热力</h3>
                    <InterviewCalendar heatmap={stats.interviewHeatmap} />
                  </div>

                  {/* 右下：趋势 */}
                  <div className="card p-5 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-700 mb-4">近 30 天趋势</h3>
                    <TrendChart data={stats.dailyTrend} />
                  </div>
                </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ═══ Tab: 收藏 ═══ */}
        {mainTab === "saved" && (
          <>
            {savedItems.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center text-gray-300">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                </div>
                <p className="text-sm text-gray-500">暂无收藏岗位</p>
                <p className="text-xs text-gray-400 mt-1">去首页点心形收藏感兴趣的职位</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {savedItems.map((item) => (
                  <div key={item.id} className="card p-4 space-y-3 hover:shadow-md transition">
                    <div>
                      <div className="text-sm font-bold text-gray-900">{item.company}</div>
                      <div className="text-sm text-gray-600 mt-0.5">{item.title}</div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                        {item.location && <span>{item.location}</span>}
                        {item.jobType && <><span>·</span><span>{item.jobType}</span></>}
                      </div>
                    </div>
                    {item.job?.tags && item.job.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.job.tags.slice(0, 5).map((tag) => (
                          <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <button onClick={() => markAsApplied(item.id)} className="text-xs px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition font-medium">
                        标为已投递
                      </button>
                      {item.applyUrl && <a href={item.applyUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:text-brand-700">投递链接 →</a>}
                      <button onClick={() => deleteEntry(item.id)} className="text-xs text-red-400 hover:text-red-600 ml-auto">删除</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {showForm && (
        <InterviewForm
          initial={editRecord}
          trackedJobs={trackedJobOptions}
          onSave={handleInterviewSave}
          onCancel={() => { setShowForm(false); setEditRecord(undefined); }}
        />
      )}
    </div>
  );
}
