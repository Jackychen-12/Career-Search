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
import { getOrCreateInbox, loadPendingEmailRecords, confirmEmailRecord, dismissEmailRecord, ACTION_LABELS, type EmailRecord } from "@/lib/emailInbox";
import type { Job } from "@/lib/types";
import InterviewForm from "./InterviewForm";
import type { TrackedJobOption } from "./InterviewForm";

const FunnelChart = dynamic(() => import("./charts/FunnelChart").then((m) => ({ default: m.FunnelChart })), { ssr: false });
const TrendChart = dynamic(() => import("./charts/TrendChart").then((m) => ({ default: m.TrendChart })), { ssr: false });
const InterviewCalendar = dynamic(() => import("./charts/InterviewCalendar").then((m) => ({ default: m.InterviewCalendar })), { ssr: false });

const STATUS_KEYS: TrackingStatus[] = ["applied", "written", "interview", "hr", "offer", "rejected", "withdrawn"];

const STATUS_CONFIG: Record<TrackingStatus, { label: string; color: string; bg: string; order: number; light: string; border: string; hex: string }> = {
  saved:     { label: "收藏",   color: "text-[#9CA3AF]",  bg: "bg-[#9CA3AF]",  order: 0, light: "bg-[rgba(156,163,175,0.10)]", border: "border-l-[#9CA3AF]",  hex: "#9CA3AF" },
  applied:   { label: "已投递", color: "text-brand-500",   bg: "bg-brand-500",  order: 1, light: "bg-[rgba(91,76,255,0.10)]",   border: "border-l-brand-500",   hex: "#5b4cff" },
  written:   { label: "笔试",   color: "text-[#F59E0B]",  bg: "bg-[#F59E0B]",  order: 2, light: "bg-[rgba(245,158,11,0.10)]",  border: "border-l-[#F59E0B]",  hex: "#F59E0B" },
  interview: { label: "面试",   color: "text-[#1ABCFE]",  bg: "bg-[#1ABCFE]",  order: 3, light: "bg-[rgba(26,188,254,0.10)]",  border: "border-l-[#1ABCFE]",  hex: "#1ABCFE" },
  hr:        { label: "HR面",   color: "text-[#8B5CF6]",  bg: "bg-[#8B5CF6]",  order: 4, light: "bg-[rgba(139,92,246,0.10)]",  border: "border-l-[#8B5CF6]",  hex: "#8B5CF6" },
  offer:     { label: "Offer",  color: "text-[#10B981]",  bg: "bg-[#10B981]",  order: 5, light: "bg-[rgba(16,185,129,0.10)]",  border: "border-l-[#10B981]",  hex: "#10B981" },
  rejected:  { label: "已拒",   color: "text-[#F43F5E]",  bg: "bg-[#F43F5E]",  order: 6, light: "bg-[rgba(244,63,94,0.10)]",   border: "border-l-[#F43F5E]",  hex: "#F43F5E" },
  withdrawn: { label: "放弃",   color: "text-[#94a3b8]",  bg: "bg-[#94a3b8]",  order: 7, light: "bg-[rgba(148,163,184,0.10)]", border: "border-l-[#94a3b8]",  hex: "#94a3b8" },
};

const KANBAN_COLS: TrackingStatus[] = ["applied", "written", "interview", "hr", "offer"];

const CATEGORY_HEX: Record<string, string> = {
  "互联网": "#5b4cff", "金融": "#F59E0B", "外企": "#10B981",
  "快消": "#F97316", "实体": "#78716c", "管培": "#8B5CF6", "其他": "#9CA3AF",
};

const CHIP_KEYS: TrackingStatus[] = ["saved", "applied", "written", "interview", "hr", "offer", "rejected"];

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

type MainTab = "rec" | "ov" | "coach";
type SubView = "table" | "kanban";

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
  const [mainTab, setMainTab] = useState<MainTab>("rec");
  const [subView, setSubView] = useState<SubView>("table");
  const [editId, setEditId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TrackingStatus | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<InterviewRecord | undefined>();
  const [aiAnalysis, setAiAnalysis] = useState<ProgressAnalyzeResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [collapsedCols, setCollapsedCols] = useState<Set<TrackingStatus>>(new Set());
  const [showEmailSetup, setShowEmailSetup] = useState(false);
  const [inboxAddress, setInboxAddress] = useState<string | null>(null);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [emailRecords, setEmailRecords] = useState<EmailRecord[]>([]);
  const [emailBannerOpen, setEmailBannerOpen] = useState(true);
  const [copiedInbox, setCopiedInbox] = useState(false);
  const [emailGuide, setEmailGuide] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  useEffect(() => {
    getSession().then((s) => {
      setLoggedIn(!!s);
      if (s) {
        Promise.all([loadTracking(), loadInterviews()]).then(([t, i]) => {
          setTracking(t);
          setInterviews(i);
          setLoaded(true);
        });
        loadPendingEmailRecords().then(setEmailRecords);
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

  const filteredItems = useMemo(() => {
    let list = activeItems;
    if (statusFilter) list = list.filter((i) => i.status === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((i) => i.company.toLowerCase().includes(q) || i.title.toLowerCase().includes(q));
    }
    return list;
  }, [activeItems, statusFilter, searchQuery]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach((i) => { c[i.status] = (c[i.status] ?? 0) + 1; });
    return c;
  }, [items]);

  const tableItems = useMemo(() => {
    let list = statusFilter ? items.filter((i) => i.status === statusFilter) : items;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((i) => i.company.toLowerCase().includes(q) || i.title.toLowerCase().includes(q));
    }
    if (sortKey) {
      list = [...list].sort((a, b) => {
        let va: string | number, vb: string | number;
        switch (sortKey) {
          case "company": va = a.company; vb = b.company; break;
          case "title": va = a.title; vb = b.title; break;
          case "status": va = STATUS_CONFIG[a.status].order; vb = STATUS_CONFIG[b.status].order; break;
          case "applyDate": va = a.entry.appliedAt ?? ""; vb = b.entry.appliedAt ?? ""; break;
          case "deadline": va = a.job?.deadline ?? ""; vb = b.job?.deadline ?? ""; break;
          case "matchScore": va = a.job?.scores?.aiMatch ?? 0; vb = b.job?.scores?.aiMatch ?? 0; break;
          default: va = a.entry.updatedAt; vb = b.entry.updatedAt;
        }
        if (typeof va === "number" && typeof vb === "number") return sortAsc ? va - vb : vb - va;
        return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
    }
    return list;
  }, [items, statusFilter, searchQuery, sortKey, sortAsc]);

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
    if ((mainTab === "ov" || mainTab === "coach") && !aiAnalysis && !aiLoading && loggedIn && (activeItems.length > 0 || Object.keys(tracking).length > 0)) {
      handleAnalyze();
    }
  }, [mainTab, loggedIn, activeItems.length]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest("[data-status-dd]")) setStatusDropdownId(null);
      if (!(e.target as HTMLElement).closest("[data-filter-dd]")) setFilterDropdownOpen(false);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

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

  async function openEmailSetup() {
    setShowEmailSetup(true);
    if (!inboxAddress) {
      setInboxLoading(true);
      const addr = await getOrCreateInbox();
      setInboxAddress(addr);
      setInboxLoading(false);
    }
  }

  async function handleConfirmEmail(record: EmailRecord) {
    const actionMap: Record<string, TrackingStatus> = {
      applied: "applied",
      interview_invite: "interview",
      written_test: "written",
      offer: "offer",
      rejection: "rejected",
    };
    const status = actionMap[record.parsed_action] ?? "applied";
    const company = record.parsed_company || "未知公司";
    const position = record.parsed_position || "未知岗位";

    await saveInterview({
      company,
      position,
      status: record.parsed_action === "applied" ? "已投递" : record.parsed_action === "interview_invite" ? "进行中" : record.parsed_action === "offer" ? "已拿offer" : record.parsed_action === "rejection" ? "已拒" : "已投递",
      rounds: [],
      notes: `来源：邮件自动解析\n主题：${record.subject}`,
    });
    await confirmEmailRecord(record.id);
    setEmailRecords((prev) => prev.filter((r) => r.id !== record.id));
    const freshInterviews = await loadInterviews();
    setInterviews(freshInterviews);
  }

  async function handleDismissEmail(id: string) {
    await dismissEmailRecord(id);
    setEmailRecords((prev) => prev.filter((r) => r.id !== id));
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

  function handleSort(key: string) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  }

  function toggleCheck(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAllChecked(checked: boolean) {
    if (checked) setCheckedIds(new Set(tableItems.map((i) => i.id)));
    else setCheckedIds(new Set());
  }

  function getDeadlineDays(deadline: string | null | undefined): number | null {
    if (!deadline) return null;
    const dl = new Date(deadline);
    const now = new Date();
    return Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[rgba(0,0,0,0.04)] flex items-center justify-center text-[var(--text-t)] text-xl">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </div>
          <p className="text-sm text-[var(--text-s)]">请先登录查看求职管理</p>
        </div>
      </div>
    );
  }

  const mainTabs: { key: MainTab; label: string; count?: number }[] = [
    { key: "rec", label: "投递记录", count: items.length },
    { key: "ov", label: "数据概览" },
    { key: "coach", label: "AI Coach" },
  ];

  const sortArrow = (key: string) => sortKey === key ? (sortAsc ? " ▲" : " ▼") : "";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-[var(--surface)] backdrop-blur-[8px] [backdrop-filter:blur(8px)_saturate(180%)] [-webkit-backdrop-filter:blur(8px)_saturate(180%)] border-b border-[var(--border)]" style={{ boxShadow: "0 1px 8px rgba(91,76,255,.04)" }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-2.5">
          <a href="/" className="text-[13px] font-bold text-[var(--text)] hover:text-brand-500 transition shrink-0">← Career Search</a>
          <span className="text-[var(--text-t)]">·</span>
          <div className="flex gap-0.5 p-[3px] bg-[rgba(0,0,0,0.04)] rounded-[var(--radius-xs)]">
            {mainTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setMainTab(t.key); setStatusFilter(null); setEditId(null); }}
                className={`px-3.5 py-1 rounded-[6px] text-[13px] font-semibold transition flex items-center gap-1.5 ${mainTab === t.key ? "bg-[var(--surface-solid)] text-[var(--text)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "text-[var(--text-s)] hover:text-[var(--text)]"}`}
              >
                {t.label}
                {t.count !== undefined && t.count > 0 && <span className="text-[11px] text-[var(--text-t)] font-mono">{t.count}</span>}
              </button>
            ))}
          </div>
          <div className="flex-1" />
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 space-y-4">

        {/* ═══ Tab: 投递记录 ═══ */}
        {mainTab === "rec" && (
          <>
            {/* ── Unified Toolbar ── */}
            <div className="flex items-center gap-2.5 p-3 px-[18px] bg-[var(--surface)] backdrop-blur-[8px] [backdrop-filter:blur(8px)_saturate(180%)] [-webkit-backdrop-filter:blur(8px)_saturate(180%)] rounded-[var(--radius)] border border-[rgba(255,255,255,0.6)] shadow-[var(--shadow)] flex-wrap relative z-10">
              {/* View toggle */}
              <div className="flex gap-0.5 p-[3px] bg-[rgba(0,0,0,0.04)] rounded-[var(--radius-xs)] shrink-0">
                {(["table", "kanban"] as SubView[]).map((v) => (
                  <button key={v} onClick={() => { setSubView(v); setEditId(null); }}
                    className={`px-3.5 py-1.5 rounded-[6px] text-[13px] font-semibold transition flex items-center gap-1 ${subView === v ? "bg-[var(--surface-solid)] text-[var(--text)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "text-[var(--text-s)] hover:text-[var(--text)]"}`}>
                    {v === "table" ? (
                      <><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="14" height="14" rx="2"/><path d="M1 5h14M1 9h14M5 1v14M10 1v14"/></svg> 表格</>
                    ) : (
                      <><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="4" height="14" rx="1"/><rect x="6" y="1" width="4" height="10" rx="1"/><rect x="11" y="1" width="4" height="12" rx="1"/></svg> 看板</>
                    )}
                  </button>
                ))}
              </div>
              {/* Separator */}
              <div className="w-px h-[22px] bg-[var(--border-s)] shrink-0" />
              {/* Filter button */}
              <div className="relative" data-filter-dd>
                <button onClick={(e) => { e.stopPropagation(); setFilterDropdownOpen(!filterDropdownOpen); }}
                  className={`px-3 py-[5px] rounded-[var(--radius-xs)] text-xs font-semibold border transition flex items-center gap-1 ${statusFilter ? "border-brand-500 text-brand-500 bg-[var(--primary-light)]" : "border-[var(--border)] text-[var(--text-s)] hover:border-brand-500 hover:text-brand-500 hover:bg-[var(--primary-light)]"}`}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 2h14M3 5.5h10M5.5 9h5M7 12.5h2"/></svg>
                  <span>筛选</span>
                </button>
                {filterDropdownOpen && (
                  <div className="absolute top-[calc(100%+4px)] left-0 bg-[var(--surface-solid)] rounded-[var(--radius-sm)] border border-[var(--border-s)] shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-1.5 min-w-[180px] z-50">
                    <div className="text-[10px] font-bold text-[var(--text-t)] px-2 py-1 uppercase tracking-wider">按状态</div>
                    <button onClick={() => { setStatusFilter(null); setFilterDropdownOpen(false); }}
                      className={`w-full px-2 py-1.5 rounded-[5px] text-xs font-medium flex items-center gap-1.5 transition text-left ${!statusFilter ? "text-brand-500 font-semibold" : "text-[var(--text-s)] hover:bg-[var(--primary-light)] hover:text-brand-500"}`}>
                      全部
                    </button>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <button key={k} onClick={() => { setStatusFilter(k as TrackingStatus); setFilterDropdownOpen(false); }}
                        className={`w-full px-2 py-1.5 rounded-[5px] text-xs font-medium flex items-center gap-1.5 transition text-left ${statusFilter === k ? "text-brand-500 font-semibold" : "text-[var(--text-s)] hover:bg-[var(--primary-light)] hover:text-brand-500"}`}>
                        <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: v.hex }} />
                        {v.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Search */}
              <div className="ml-auto relative">
                <svg className="absolute left-[9px] top-1/2 -translate-y-1/2 w-[13px] h-[13px] text-[var(--text-t)]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="6.5" cy="6.5" r="5"/><path d="M10.5 10.5L15 15"/></svg>
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索公司、岗位..."
                  className="pl-[30px] pr-3 py-1.5 rounded-[var(--radius-xs)] border border-[var(--border)] bg-transparent text-xs text-[var(--text)] outline-none w-[180px] focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(91,76,255,0.08)] focus:w-[240px] transition-all placeholder:text-[var(--text-t)]" />
              </div>
              {/* Email sync */}
              <button onClick={openEmailSetup}
                className="px-3 py-[5px] rounded-[var(--radius-xs)] text-xs font-semibold border border-[var(--border)] text-[var(--text-s)] hover:border-brand-500 hover:text-brand-500 hover:bg-[var(--primary-light)] transition flex items-center gap-1">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                <span>邮件同步</span>
                {emailRecords.length > 0 && <span className="bg-[var(--rose)] text-white text-[10px] font-bold min-w-[16px] h-4 rounded-full inline-flex items-center justify-center px-1 ml-0.5">{emailRecords.length}</span>}
              </button>
              {/* Export */}
              {(activeItems.length > 0 || Object.keys(tracking).length > 0) && (
                <button onClick={exportExcel} className="text-[12px] text-[var(--text-s)] hover:text-brand-500 transition">导出</button>
              )}
              {/* New record */}
              <button onClick={() => { setEditRecord(undefined); setShowForm(true); }}
                className="px-4 py-1.5 rounded-[var(--radius-xs)] bg-brand-500 text-white text-xs font-semibold hover:bg-[#4a3de0] transition shrink-0">
                + 新增记录
              </button>
            </div>

            {/* ── Email Setup Panel ── */}
            {showEmailSetup && (
              <div className="card p-5 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5b4cff" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    <h3 className="text-sm font-bold text-[var(--text)]">邮件自动同步</h3>
                  </div>
                  <button onClick={() => setShowEmailSetup(false)} className="text-[var(--text-t)] hover:text-[var(--text-s)] text-lg leading-none">&times;</button>
                </div>
                {inboxLoading ? (
                  <div className="flex items-center gap-2 py-3">
                    <div className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                    <span className="text-sm text-[var(--text-s)]">正在生成专属地址...</span>
                  </div>
                ) : inboxAddress ? (
                  <>
                    <div>
                      <p className="text-xs text-[var(--text-s)] mb-1.5">你的专属转发地址：</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-[rgba(0,0,0,0.02)] rounded-[var(--radius-xs)] border border-[var(--border-s)] text-sm font-mono text-[var(--text)] tracking-wider select-all">{inboxAddress}</code>
                        <button
                          onClick={() => { navigator.clipboard.writeText(inboxAddress); setCopiedInbox(true); setTimeout(() => setCopiedInbox(false), 2000); }}
                          className="px-3 py-2 rounded-[var(--radius-xs)] bg-brand-500 text-white text-xs font-semibold hover:bg-[#4a3de0] transition shrink-0"
                        >
                          {copiedInbox ? "已复制" : "复制"}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-[var(--text-s)]">设置方法：</p>
                      <ol className="text-xs text-[var(--text-s)] space-y-1 list-decimal list-inside">
                        <li>打开你常用邮箱的设置（QQ邮箱/163/Outlook）</li>
                        <li>找到「自动转发」或「邮件规则/过滤器」</li>
                        <li>添加规则：主题包含&quot;投递&quot;、&quot;申请&quot;、&quot;面试&quot;等关键词的邮件 → 转发到上方地址</li>
                      </ol>
                      <p className="text-xs text-[var(--text-t)]">转发的求职邮件会自动被 AI 解析为投递/面试记录。</p>
                    </div>
                    <div className="flex gap-2">
                      {(["QQ邮箱", "163邮箱", "Outlook"] as const).map((provider) => (
                        <button key={provider} onClick={() => setEmailGuide(emailGuide === provider ? null : provider)}
                          className={`px-2.5 py-1 rounded-full text-xs transition ${emailGuide === provider ? "bg-[var(--primary-light)] text-brand-500 border border-brand-500" : "border border-[var(--border)] text-[var(--text-s)] hover:border-brand-500 hover:text-brand-500"}`}>
                          {provider}教程
                        </button>
                      ))}
                    </div>
                    {emailGuide === "QQ邮箱" && (
                      <div className="bg-[rgba(0,0,0,0.02)] rounded-[var(--radius-xs)] p-3 text-xs text-[var(--text-s)] space-y-1">
                        <p className="font-semibold text-[var(--text)]">QQ邮箱设置自动转发：</p>
                        <p>1. 登录 mail.qq.com → 设置 → 收发信规则</p>
                        <p>2. 点击「创建收信规则」</p>
                        <p>3. 条件：主题包含 &quot;投递&quot; 或 &quot;申请&quot; 或 &quot;面试&quot;</p>
                        <p>4. 操作：转发到 <code className="bg-[rgba(0,0,0,0.04)] px-1 rounded">{inboxAddress}</code></p>
                        <p>5. 保存规则</p>
                      </div>
                    )}
                    {emailGuide === "163邮箱" && (
                      <div className="bg-[rgba(0,0,0,0.02)] rounded-[var(--radius-xs)] p-3 text-xs text-[var(--text-s)] space-y-1">
                        <p className="font-semibold text-[var(--text)]">163邮箱设置自动转发：</p>
                        <p>1. 登录 mail.163.com → 设置 → 邮箱设置</p>
                        <p>2. 找到「转发和 POP/IMAP/SMTP」</p>
                        <p>3. 开启转发，设置转发地址为 <code className="bg-[rgba(0,0,0,0.04)] px-1 rounded">{inboxAddress}</code></p>
                        <p>4. 或使用「来信分类」设置过滤规则只转发求职相关邮件</p>
                      </div>
                    )}
                    {emailGuide === "Outlook" && (
                      <div className="bg-[rgba(0,0,0,0.02)] rounded-[var(--radius-xs)] p-3 text-xs text-[var(--text-s)] space-y-1">
                        <p className="font-semibold text-[var(--text)]">Outlook 设置自动转发：</p>
                        <p>1. 打开 outlook.com → 设置 → 邮件 → 规则</p>
                        <p>2. 添加新规则：条件选择&quot;主题包含&quot;</p>
                        <p>3. 输入关键词：投递、申请、面试、offer</p>
                        <p>4. 操作：转发到 <code className="bg-[rgba(0,0,0,0.04)] px-1 rounded">{inboxAddress}</code></p>
                        <p>5. 保存</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-red-500">生成转发地址失败，请稍后重试</p>
                )}
              </div>
            )}

            {/* ── Email Pending Banner ── */}
            {emailRecords.length > 0 && emailBannerOpen && (
              <div className="bg-[var(--amber-light)] border border-[rgba(245,158,11,0.2)] rounded-[var(--radius)] overflow-hidden">
                <button onClick={() => setEmailBannerOpen(!emailBannerOpen)} className="w-full px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    <span className="text-sm font-semibold text-amber-800">收到 {emailRecords.length} 封新的求职邮件</span>
                  </div>
                  <span className="text-xs text-amber-600">点击确认添加为记录</span>
                </button>
                <div className="border-t border-amber-200/60 divide-y divide-amber-100">
                  {emailRecords.map((record) => {
                    const actionInfo = ACTION_LABELS[record.parsed_action] || ACTION_LABELS.other;
                    return (
                      <div key={record.id} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[var(--text)] truncate">{record.parsed_company || "未知公司"}</span>
                            <span className="text-xs text-[var(--text-t)]">·</span>
                            <span className="text-xs text-[var(--text-s)] truncate">{record.parsed_position || "未知岗位"}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${record.parsed_action === "offer" ? "bg-[var(--green-light)] text-[var(--green)]" : record.parsed_action === "rejection" ? "bg-[var(--rose-light)] text-[var(--rose)]" : record.parsed_action === "interview_invite" ? "bg-[var(--cyan-light)] text-[var(--cyan)]" : "bg-[var(--primary-light)] text-brand-500"}`}>
                              {actionInfo.label}
                            </span>
                            {record.parsed_date && <span className="text-[11px] text-[var(--text-t)]">{record.parsed_date}</span>}
                            <span className="text-[11px] text-[var(--text-t)] truncate">{record.subject}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => handleConfirmEmail(record)} className="px-3 py-1.5 rounded-[5px] bg-brand-500 text-white text-xs font-semibold hover:bg-[#4a3de0] transition">确认添加</button>
                          <button onClick={() => handleDismissEmail(record.id)} className="px-2.5 py-1.5 rounded-[5px] text-xs text-[var(--text-s)] hover:text-[var(--rose)] hover:bg-[var(--rose-light)] transition">忽略</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Status Dot Bar ── */}
            {items.length > 0 && (
              <div className="flex items-center flex-wrap gap-5 px-0.5">
                <span className="flex items-center gap-1.5 py-0.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--text)]" />
                  <span className="text-[13px] text-[var(--text-s)] font-medium">总投递</span>
                  <span className="text-[13px] font-bold text-[var(--text)] font-mono tabular-nums">{items.length}</span>
                </span>
                {CHIP_KEYS.map((key) => {
                  const cfg = STATUS_CONFIG[key];
                  const count = counts[key] ?? 0;
                  if (count === 0) return null;
                  return (
                    <button
                      key={key}
                      onClick={() => setStatusFilter(statusFilter === key ? null : key)}
                      className={`flex items-center gap-1.5 cursor-pointer transition py-0.5 ${statusFilter === key ? "font-extrabold" : "hover:opacity-75"}`}
                      style={{ borderBottom: statusFilter === key ? `2px solid ${cfg.hex}` : "2px solid transparent", color: statusFilter === key ? cfg.hex : undefined }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.hex }} />
                      <span className="text-[13px] text-[var(--text-s)] font-medium">{cfg.label}</span>
                      <span className="text-[13px] font-bold text-[var(--text)] font-mono tabular-nums">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {items.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-brand-50 flex items-center justify-center text-brand-400 text-xl">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12h14" /></svg>
                </div>
                <p className="text-sm text-[var(--text-s)]">还没有追踪任何岗位</p>
                <p className="text-xs text-[var(--text-t)] mt-1">去首页点心形收藏或点击「+ 新增记录」</p>
              </div>
            ) : (
              <>
                {/* ── Table View ── */}
                {subView === "table" && (
                  <div className="animate-fadeIn">
                    <div className="bg-[var(--surface)] backdrop-blur-[8px] [backdrop-filter:blur(8px)_saturate(180%)] [-webkit-backdrop-filter:blur(8px)_saturate(180%)] rounded-[var(--radius)] border border-[rgba(255,255,255,0.6)] shadow-[var(--shadow)]">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse min-w-[920px]">
                          <thead>
                            <tr>
                              <th className="bg-[var(--surface-solid)] border-b-2 border-[var(--border-s)] p-[10px_12px] text-[11px] font-bold text-[var(--text-t)] text-left whitespace-nowrap" style={{ width: 32 }}>
                                <input type="checkbox" className="w-[15px] h-[15px] accent-brand-500 cursor-pointer"
                                  onChange={(e) => toggleAllChecked(e.target.checked)} />
                              </th>
                              {[
                                { key: "company", label: "公司", sortable: true },
                                { key: "title", label: "岗位", sortable: true },
                                { key: "status", label: "状态", sortable: true },
                                { key: "applyDate", label: "投递日期", sortable: true },
                                { key: "deadline", label: "截止日期", sortable: true },
                                { key: "matchScore", label: "匹配度", sortable: true },
                                { key: "salary", label: "薪资", sortable: false },
                                { key: "notes", label: "备注", sortable: false },
                                { key: "action", label: "操作", sortable: false, width: 90 },
                              ].map((col) => (
                                <th key={col.key}
                                  className="bg-[var(--surface-solid)] border-b-2 border-[var(--border-s)] p-[10px_12px] text-[11px] font-bold text-[var(--text-t)] text-left whitespace-nowrap relative [&:not(:last-child)]:after:content-[''] [&:not(:last-child)]:after:absolute [&:not(:last-child)]:after:right-0 [&:not(:last-child)]:after:top-[20%] [&:not(:last-child)]:after:h-[60%] [&:not(:last-child)]:after:w-px [&:not(:last-child)]:after:bg-[var(--border)]"
                                  style={col.width ? { width: col.width } : undefined}>
                                  {col.sortable ? (
                                    <div className={`flex items-center gap-[3px] cursor-pointer hover:text-brand-500 ${sortKey === col.key ? "text-brand-500 font-bold" : ""}`}
                                      onClick={() => handleSort(col.key)}>
                                      {col.label}
                                      <span className="text-[10px] ml-px">{sortArrow(col.key)}</span>
                                    </div>
                                  ) : col.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {tableItems.map((item, rowIdx) => {
                              const matchPct = item.job?.scores?.aiMatch != null ? Math.round(item.job.scores.aiMatch * 100) : null;
                              const matchColor = matchPct != null ? (matchPct >= 80 ? "var(--green)" : matchPct >= 60 ? "var(--amber)" : "var(--rose)") : "var(--text-t)";
                              const deadlineDays = getDeadlineDays(item.job?.deadline);
                              const catColor = item.job?.category ? CATEGORY_HEX[item.job.category] ?? "#9CA3AF" : "#9CA3AF";
                              const cfg = STATUS_CONFIG[item.status];
                              return (
                                <tr key={item.id} className="transition-colors hover:!bg-[rgba(91,76,255,0.06)]">
                                  <td className={`p-[9px_12px] text-xs border-b border-[var(--border)] align-middle whitespace-nowrap ${rowIdx % 2 === 1 ? "bg-[rgba(0,0,0,0.015)]" : ""}`}>
                                    <input type="checkbox" checked={checkedIds.has(item.id)} onChange={() => toggleCheck(item.id)} className="w-[15px] h-[15px] accent-brand-500 cursor-pointer" />
                                  </td>
                                  <td className={`p-[9px_12px] text-xs border-b border-[var(--border)] align-middle whitespace-nowrap ${rowIdx % 2 === 1 ? "bg-[rgba(0,0,0,0.015)]" : ""}`}>
                                    <div className="flex items-center gap-[7px]">
                                      <span className="w-[3px] h-6 rounded-sm shrink-0" style={{ backgroundColor: catColor }} />
                                      <span className="font-bold text-xs text-[var(--text)]">{item.company}</span>
                                    </div>
                                  </td>
                                  <td className={`p-[9px_12px] text-xs border-b border-[var(--border)] align-middle whitespace-nowrap text-[var(--text-s)] ${rowIdx % 2 === 1 ? "bg-[rgba(0,0,0,0.015)]" : ""}`}>{item.title}</td>
                                  <td className={`p-[9px_12px] text-xs border-b border-[var(--border)] align-middle whitespace-nowrap ${rowIdx % 2 === 1 ? "bg-[rgba(0,0,0,0.015)]" : ""}`}>
                                    <div className="relative" data-status-dd>
                                      <span onClick={(e) => { e.stopPropagation(); setStatusDropdownId(statusDropdownId === item.id ? null : item.id); }}
                                        className={`inline-flex items-center gap-[3px] px-2.5 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer transition hover:scale-[1.03] ${cfg.light} ${cfg.color}`}>
                                        {cfg.label}
                                        <svg className="w-2 h-2 opacity-50" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3.5l3 3 3-3"/></svg>
                                      </span>
                                      {statusDropdownId === item.id && (
                                        <div className="absolute top-[calc(100%+3px)] left-0 bg-[var(--surface-solid)] rounded-[var(--radius-xs)] border border-[var(--border-s)] shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-1 min-w-[120px] z-[60]">
                                          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                            <button key={k} onClick={() => { updateEntry(item.id, { status: k as TrackingStatus }); setStatusDropdownId(null); }}
                                              className="w-full px-2.5 py-[5px] rounded-[5px] text-[11px] font-semibold flex items-center gap-[5px] hover:bg-[var(--primary-light)] transition text-left">
                                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: v.hex }} />
                                              {v.label}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className={`p-[9px_12px] text-xs border-b border-[var(--border)] align-middle whitespace-nowrap text-[var(--text-s)] ${rowIdx % 2 === 1 ? "bg-[rgba(0,0,0,0.015)]" : ""}`}>{item.entry.appliedAt ?? "-"}</td>
                                  <td className={`p-[9px_12px] text-xs border-b border-[var(--border)] align-middle whitespace-nowrap ${rowIdx % 2 === 1 ? "bg-[rgba(0,0,0,0.015)]" : ""}`}>
                                    {item.job?.deadline ? (
                                      <>
                                        <span className={deadlineDays != null && deadlineDays <= 3 ? "text-[var(--rose)] font-bold" : deadlineDays != null && deadlineDays <= 7 ? "text-[var(--amber)] font-semibold" : "text-[var(--text-s)]"}>
                                          {item.job.deadline.slice(5)}
                                        </span>
                                        {deadlineDays != null && (
                                          <span className={`text-[10px] font-bold px-[5px] py-px rounded-full ml-[3px] ${deadlineDays <= 0 ? "bg-[var(--rose-light)] text-[var(--rose)]" : deadlineDays <= 3 ? "bg-[var(--rose-light)] text-[var(--rose)]" : deadlineDays <= 7 ? "bg-[var(--amber-light)] text-[var(--amber)]" : "bg-[var(--green-light)] text-[var(--green)]"}`}>
                                            {deadlineDays > 0 ? `${deadlineDays}天` : deadlineDays === 0 ? "今天" : "已过"}
                                          </span>
                                        )}
                                      </>
                                    ) : <span className="text-[var(--text-t)]">-</span>}
                                  </td>
                                  <td className={`p-[9px_12px] text-xs border-b border-[var(--border)] align-middle whitespace-nowrap ${rowIdx % 2 === 1 ? "bg-[rgba(0,0,0,0.015)]" : ""}`}>
                                    {matchPct != null ? (
                                      <div className="flex items-center gap-[5px]">
                                        <div className="w-11 h-[5px] rounded-[3px] bg-[var(--border-s)] overflow-hidden shrink-0">
                                          <div className="h-full rounded-[3px]" style={{ width: `${matchPct}%`, backgroundColor: matchColor }} />
                                        </div>
                                        <span className="text-[11px] font-bold font-mono" style={{ color: matchColor }}>{matchPct}%</span>
                                      </div>
                                    ) : <span className="text-[11px] text-[var(--text-t)]">-</span>}
                                  </td>
                                  <td className={`p-[9px_12px] text-xs border-b border-[var(--border)] align-middle whitespace-nowrap text-[var(--text-s)] ${rowIdx % 2 === 1 ? "bg-[rgba(0,0,0,0.015)]" : ""}`}>{item.entry.salary || item.job?.salary || "-"}</td>
                                  <td className={`p-[9px_12px] text-xs border-b border-[var(--border)] align-middle whitespace-nowrap ${rowIdx % 2 === 1 ? "bg-[rgba(0,0,0,0.015)]" : ""}`}>
                                    <span className="text-[11px] text-[var(--text-s)] max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap block px-[5px] py-0.5 rounded-[3px] border border-transparent hover:border-[var(--border-s)] hover:bg-[var(--surface-solid)] cursor-text transition"
                                      title={item.entry.notes ?? "点击添加"}>
                                      {item.entry.notes ?? "-"}
                                    </span>
                                  </td>
                                  <td className={`p-[9px_12px] text-xs border-b border-[var(--border)] align-middle whitespace-nowrap ${rowIdx % 2 === 1 ? "bg-[rgba(0,0,0,0.015)]" : ""}`}>
                                    {item.status === "saved" ? (
                                      <button onClick={() => markAsApplied(item.id)} className="px-2.5 py-[3px] rounded-[5px] text-[11px] font-semibold bg-brand-500 text-white border-none hover:bg-[#4a3de0] transition">投递</button>
                                    ) : item.job ? (
                                      <a href={`/job/${item.job.id}`} className="px-2.5 py-[3px] rounded-[5px] text-[11px] font-semibold border border-[var(--border)] text-[var(--text-s)] hover:border-brand-500 hover:text-brand-500 hover:bg-[var(--primary-light)] transition inline-block">详情</a>
                                    ) : null}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {/* Table footer */}
                      <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border)]">
                        <span className="text-[11px] text-[var(--text-t)]">共 <b className="text-[var(--text)] font-bold">{tableItems.length}</b> 条记录</span>
                        <div className="flex gap-[3px]">
                          <button className="w-7 h-7 rounded-[5px] border border-transparent bg-brand-500 text-white text-[11px] font-semibold flex items-center justify-center">1</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
                              className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-xs)] cursor-pointer select-none ${cfg.light} hover:opacity-80 transition`}
                            >
                              <span className="w-[9px] h-[9px] rounded-full" style={{ backgroundColor: cfg.hex }} />
                              <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                              <span className="text-[11px] font-semibold ml-auto opacity-60">{colItems.length}</span>
                              <svg className={`w-3.5 h-3.5 text-[var(--text-t)] transition-transform ${isCollapsed ? "-rotate-90" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                            </div>
                            {!isCollapsed && (
                            <div className="space-y-1.5 min-h-[80px] max-h-[480px] overflow-y-auto pr-0.5">
                              {colItems.map((t) => {
                                const isEnded = t.status === "rejected" || t.status === "withdrawn";
                                return (
                                  <div
                                    key={t.id}
                                    onClick={() => setEditId(editId === t.id ? null : t.id)}
                                    className={`card p-[11px_13px] cursor-pointer transition border-l-[3px] ${STATUS_CONFIG[t.status].border} ${isEnded ? "opacity-50" : ""} ${editId === t.id ? "outline outline-2 outline-brand-500 -outline-offset-1" : ""} hover:shadow-[var(--shadow-hover)] hover:-translate-y-px`}
                                  >
                                    <div className={`text-xs font-bold text-[var(--text)] truncate ${isEnded ? "line-through" : ""}`}>{t.company}</div>
                                    <div className="text-[11px] text-[var(--text-s)] mt-px truncate">{t.title}</div>
                                    {t.interview?.department && <div className="text-[10px] text-brand-500 font-medium mt-px">{t.interview.department}</div>}
                                    {t.entry.appliedAt && <div className="text-[10px] text-[var(--text-t)] mt-px font-mono">投递 {t.entry.appliedAt.slice(5)}</div>}
                                    {t.entry.channel && <div className="text-[10px] text-[var(--text-t)] mt-px">渠道: {t.entry.channel}</div>}
                                    {isEnded && <div className="text-[10px] text-[var(--rose)] mt-0.5">{STATUS_CONFIG[t.status].label}</div>}
                                    {t.interview && !isEnded && (
                                      <div className="text-[10px] text-[var(--amber)] mt-0.5">{t.interview.rounds.length}轮面试</div>
                                    )}
                                    {t.interview?.nextInterviewAt && !isEnded && (
                                      <div className="text-[10px] text-brand-500 mt-px font-mono">下次 {t.interview.nextInterviewAt.slice(5)}</div>
                                    )}
                                    {t.entry.priority && !isEnded && (
                                      <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block mt-1 ${t.entry.priority === "high" ? "bg-[var(--rose-light)] text-[var(--rose)]" : t.entry.priority === "medium" ? "bg-[var(--amber-light)] text-[var(--amber)]" : "bg-[rgba(156,163,175,0.10)] text-[#9CA3AF]"}`}>
                                        {t.entry.priority === "high" ? "高优" : t.entry.priority === "medium" ? "中优" : "低优"}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {colItems.length === 0 && <div className="text-[11px] text-[var(--text-t)] text-center py-4">空</div>}
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
                        <div className="card p-[18px] space-y-4 border-2 border-[var(--primary-light)]">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${STATUS_CONFIG[item.status].bg} text-white`}>{STATUS_CONFIG[item.status].label}</span>
                                <span className="text-[13px] font-bold text-[var(--text)]">{item.company} · {item.title}</span>
                              </div>
                              <div className="text-xs text-[var(--text-s)] mt-1">
                                {item.interview?.department && <span className="text-brand-500 font-medium">{item.interview.department}</span>}
                                {item.interview?.department && (item.location || item.jobType) && <span> · </span>}
                                {item.location && <>{item.location} · </>}{item.jobType}
                                {item.entry.appliedAt && ` · 投递于 ${item.entry.appliedAt.slice(0, 10)}`}
                              </div>
                            </div>
                            <button onClick={() => setEditId(null)} className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[var(--text-t)] hover:bg-[var(--border)] hover:text-[var(--text)] transition">&times;</button>
                          </div>

                          {item.interview && item.interview.rounds.length > 0 && (
                            <div className="space-y-1.5">
                              <div className="text-[10px] font-bold text-[var(--text-s)] uppercase tracking-wider">面试轮次</div>
                              {item.interview.rounds.map((round, rIdx) => (
                                <div key={round.id} className="bg-[rgba(0,0,0,0.02)] rounded-[var(--radius-xs)] px-2.5 py-[7px] flex items-center gap-[7px] text-[11px] flex-wrap">
                                  <span className="font-bold text-[var(--text-s)]">{round.round || `第${rIdx + 1}轮`}</span>
                                  <span className="text-[var(--text-t)] font-mono">{round.date}</span>
                                  {round.result && (
                                    <span className={`text-[10px] font-semibold px-[7px] py-0.5 rounded-full ${round.result === "通过" ? "bg-[var(--green-light)] text-[var(--green)]" : round.result === "挂了" ? "bg-[var(--rose-light)] text-[var(--rose)]" : "bg-[var(--amber-light)] text-[var(--amber)]"}`}>{round.result}</span>
                                  )}
                                  {round.feeling && <span className="text-[var(--text-t)]">感受: {round.feeling}</span>}
                                  {round.interviewer && <span className="text-[var(--text-t)]">· {round.interviewer}</span>}
                                </div>
                              ))}
                            </div>
                          )}

                          {(item.interview?.salaryInfo || item.entry.salary) && (
                            <div className="text-xs text-[var(--text-s)]">薪资: {item.interview?.salaryInfo || item.entry.salary}</div>
                          )}
                          {(item.interview?.notes || item.entry.notes) && (
                            <div className="text-xs text-[var(--text-s)]">备注: {item.interview?.notes || item.entry.notes}</div>
                          )}

                          <div className="flex items-center gap-2 pt-2.5 border-t border-[var(--border)] mt-2.5 flex-wrap">
                            {!item.isInterviewOnly && (
                              <>
                                <select value={item.status} onChange={(e) => updateEntry(item.id, { status: e.target.value as TrackingStatus })} className="text-[11px] px-2 py-1 rounded-[var(--radius-xs)] border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--text)]">
                                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                                <button onClick={() => deleteEntry(item.id)} className="text-[11px] text-[var(--rose)] hover:opacity-75">删除追踪</button>
                              </>
                            )}
                            {item.interview ? (
                              <button onClick={() => { setEditRecord(item.interview); setShowForm(true); }} className="text-[11px] text-brand-500 font-semibold">编辑面试</button>
                            ) : (
                              <button onClick={() => { setEditRecord(undefined); setShowForm(true); }} className="text-[11px] text-brand-500 font-semibold">添加面试</button>
                            )}
                            {item.isInterviewOnly && item.interview && (
                              <button onClick={() => handleInterviewDelete(item.interview!.id)} className="text-[11px] text-[var(--rose)] hover:opacity-75">删除记录</button>
                            )}
                            {item.job && <a href={`/job/${item.job.id}`} className="text-[11px] text-brand-500 font-semibold ml-auto">详情 →</a>}
                            {item.applyUrl && <a href={item.applyUrl} target="_blank" rel="noreferrer" className="text-[11px] text-brand-500 font-semibold">投递 →</a>}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ═══ Tab: 数据概览 ═══ */}
        {mainTab === "ov" && (
          <div className="animate-fadeIn">
            {(items.length > 0 || Object.keys(tracking).length > 0 || interviews.length > 0) ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="card p-5">
                  <h3 className="text-[13px] font-bold text-[var(--text-s)] mb-3.5">投递转化漏斗</h3>
                  <FunnelChart data={stats.conversionFunnel} />
                </div>

                <div className="card p-5">
                  <div className="flex items-center justify-between mb-3.5">
                    <h3 className="text-[13px] font-bold text-[var(--text-s)]">AI 投递分析</h3>
                    {aiAnalysis && (
                      <button onClick={handleAnalyze} className="text-[11px] text-brand-500 hover:text-brand-500 font-semibold">重新分析</button>
                    )}
                  </div>
                  {aiLoading ? (
                    <div className="flex flex-col items-center justify-center h-44 gap-3">
                      <div className="w-7 h-7 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                      <span className="text-xs text-[var(--text-t)]">AI 分析中...</span>
                    </div>
                  ) : aiError ? (
                    <div className="flex flex-col items-center justify-center h-44 gap-3">
                      <span className="text-xs text-red-500">{aiError}</span>
                      <button onClick={handleAnalyze} className="text-[11px] text-brand-500 hover:text-brand-700">重试</button>
                    </div>
                  ) : aiAnalysis ? (
                    <div className="space-y-3">
                      <p className="text-sm font-bold text-[var(--text)] leading-snug">{aiAnalysis.summary}</p>
                      <div>
                        <div className="text-[11px] font-semibold text-[var(--text-s)] uppercase tracking-wider mb-1.5">数据洞察</div>
                        <ul className="space-y-1.5">
                          {aiAnalysis.insights.map((item, i) => (
                            <li key={i} className="text-[13px] text-[var(--text)] leading-relaxed flex gap-2"><span className="text-brand-500 shrink-0 mt-0.5">•</span><span>{item}</span></li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-[var(--text-s)] uppercase tracking-wider mb-1.5">行动建议</div>
                        <ul className="space-y-1.5">
                          {aiAnalysis.suggestions.map((item, i) => (
                            <li key={i} className="text-[13px] text-[var(--text)] leading-relaxed flex gap-2"><span className="text-green-500 shrink-0 mt-0.5">•</span><span>{item}</span></li>
                          ))}
                        </ul>
                      </div>
                      {aiAnalysis.riskWarnings.length > 0 && (
                        <div className="bg-[var(--rose-light)] rounded-[var(--radius-xs)] p-3">
                          <div className="text-[11px] font-semibold text-[var(--rose)] uppercase tracking-wider mb-1.5">风险提醒</div>
                          <ul className="space-y-1">
                            {aiAnalysis.riskWarnings.map((item, i) => (
                              <li key={i} className="text-[13px] text-[var(--rose)] leading-relaxed flex gap-2"><span className="shrink-0">⚠</span><span>{item}</span></li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="pt-2.5 border-t border-[var(--border)]">
                        <div className="text-[11px] font-semibold text-[var(--text-s)] uppercase tracking-wider mb-1.5">下周计划</div>
                        <p className="text-[13px] text-[var(--text)] leading-relaxed">{aiAnalysis.weeklyPlan}</p>
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
                      <button onClick={handleAnalyze} className="px-4 py-2 rounded-[var(--radius-xs)] bg-brand-500 text-white text-xs font-semibold hover:bg-[#4a3de0] transition shadow-[var(--shadow-sm)]">
                        生成 AI 分析
                      </button>
                      <p className="text-[11px] text-[var(--text-t)]">基于你的求职数据生成个性化分析</p>
                    </div>
                  )}
                </div>

                <div className="card p-5">
                  <h3 className="text-[13px] font-bold text-[var(--text-s)] mb-3.5">求职活动热力</h3>
                  <InterviewCalendar heatmap={stats.interviewHeatmap} />
                </div>

                <div className="card p-5">
                  <h3 className="text-[13px] font-bold text-[var(--text-s)] mb-3.5">近 30 天趋势</h3>
                  <TrendChart data={stats.dailyTrend} />
                </div>
              </div>
            ) : (
              <div className="card p-12 text-center">
                <p className="text-sm text-[var(--text-s)]">暂无数据，开始追踪岗位后数据将显示在这里</p>
              </div>
            )}
          </div>
        )}

        {/* ═══ Tab: AI Coach ═══ */}
        {mainTab === "coach" && (
          <div className="animate-fadeIn space-y-4">
            {/* Summary Banner */}
            <div className="card p-5 px-6 flex items-center gap-3.5 border-l-4 border-l-brand-500">
              <span className="text-[28px] shrink-0">&#127919;</span>
              <div>
                <div className="text-[15px] font-bold text-[var(--text)] leading-snug">
                  {aiAnalysis?.summary ?? (aiLoading ? "AI 分析中..." : "分析你的求职数据...")}
                </div>
                <div className="text-xs text-[var(--text-s)] mt-0.5">
                  基于你的 {items.length} 条投递记录分析
                </div>
              </div>
            </div>

            {/* 2x2 Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Urgent Items */}
              <div className="card p-5 overflow-hidden border-t-[3px] border-t-[var(--rose)]">
                <div className="flex items-center gap-2 mb-3.5">
                  <span className="text-lg">&#128680;</span>
                  <span className="text-[13px] font-bold text-[var(--text)]">紧急事项</span>
                </div>
                {(() => {
                  const urgentItems = items.filter((i) => {
                    if (i.status === "saved" || i.status === "rejected" || i.status === "withdrawn") return false;
                    if (i.interview?.nextInterviewAt) {
                      const days = Math.ceil((new Date(i.interview.nextInterviewAt).getTime() - Date.now()) / 86400000);
                      return days >= 0 && days <= 7;
                    }
                    if (i.job?.deadline) {
                      const days = getDeadlineDays(i.job.deadline);
                      return days != null && days >= 0 && days <= 7;
                    }
                    return false;
                  }).slice(0, 3);

                  return urgentItems.length > 0 ? (
                    <div className="space-y-2">
                      {urgentItems.map((item) => {
                        const days = item.interview?.nextInterviewAt
                          ? Math.ceil((new Date(item.interview.nextInterviewAt).getTime() - Date.now()) / 86400000)
                          : getDeadlineDays(item.job?.deadline);
                        return (
                          <div key={item.id} className="p-2.5 px-3 bg-[var(--rose-light)] rounded-[var(--radius-xs)]">
                            <div className="text-[13px] font-bold text-[var(--text)] flex items-center gap-1.5">
                              {item.company} · {item.title}
                              <span className={`text-[10px] font-bold px-[7px] py-0.5 rounded-full text-white ${days != null && days <= 3 ? "bg-[var(--rose)]" : "bg-[var(--amber)]"}`}>
                                {days != null && days > 0 ? `${days}天后` : "今天"}
                              </span>
                            </div>
                            <div className="text-[11px] text-[var(--text-s)] mt-0.5">
                              {item.interview?.nextInterviewAt ? "面试即将到来" : "截止日期临近"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-t)] py-4 text-center">暂无紧急事项</p>
                  );
                })()}
              </div>

              {/* Data Insights */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3.5">
                  <span className="text-lg">&#128200;</span>
                  <span className="text-[13px] font-bold text-[var(--text)]">数据洞察</span>
                </div>
                {([
                  { metric: "面试转化率", value: `${stats.conversionFunnel.find((f) => f.stage === "面试")?.rate ?? 0}%`, trend: "up", note: "简历质量优秀" },
                  { metric: "Offer 率", value: `${stats.offerRate}%`, trend: stats.offerRate > 5 ? "up" : "flat", note: `${stats.offerRate > 5 ? "高于" : "接近"}校招平均 4-5%` },
                  { metric: "平均面试轮", value: `${stats.avgRoundsToOffer || "-"}`, trend: "flat", note: "进入面试的公司平均轮次" },
                  { metric: "本周活跃", value: `${stats.weeklyActivity}`, trend: stats.weeklyActivity > 3 ? "up" : "flat", note: "近 7 天有更新的记录" },
                ] as { metric: string; value: string; trend: string; note: string }[]).map((row, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-2 border-b border-[var(--border)] last:border-b-0">
                    <span className="text-[11px] text-[var(--text-t)] w-[70px] shrink-0">{row.metric}</span>
                    <span className="text-[15px] font-[800] text-[var(--text)] font-mono">{row.value}</span>
                    <span className={`text-[11px] font-semibold ml-1 ${row.trend === "up" ? "text-[var(--green)]" : row.trend === "down" ? "text-[var(--rose)]" : "text-[var(--text-t)]"}`}>
                      {row.trend === "up" ? "↑" : row.trend === "down" ? "↓" : "—"}
                    </span>
                    <span className="text-[11px] text-[var(--text-s)] flex-1 text-right">{row.note}</span>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3.5">
                  <span className="text-lg">&#128161;</span>
                  <span className="text-[13px] font-bold text-[var(--text)]">推荐投递</span>
                </div>
                {aiAnalysis?.suggestions && aiAnalysis.suggestions.length > 0 ? (
                  <div className="space-y-1.5">
                    {aiAnalysis.suggestions.slice(0, 3).map((s, i) => (
                      <div key={i} className="p-2.5 px-3 bg-[rgba(0,0,0,0.02)] rounded-[var(--radius-xs)] flex items-center gap-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-[var(--text)]">{s}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-t)] py-4 text-center">{aiLoading ? "AI 分析中..." : "AI 分析完成后将显示推荐"}</p>
                )}
              </div>

              {/* Weekly Plan */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3.5">
                  <span className="text-lg">&#128197;</span>
                  <span className="text-[13px] font-bold text-[var(--text)]">本周计划</span>
                </div>
                {aiAnalysis?.weeklyPlan ? (
                  <p className="text-xs text-[var(--text-s)] leading-relaxed">{aiAnalysis.weeklyPlan}</p>
                ) : (
                  <p className="text-xs text-[var(--text-t)] py-4 text-center">{aiLoading ? "AI 分析中..." : "AI 分析完成后将显示计划"}</p>
                )}
              </div>
            </div>

            {/* Pipeline Funnel */}
            <div className="card p-5 flex items-center justify-center gap-0 flex-wrap">
              {stats.conversionFunnel.filter((f) => f.stage !== "收藏").map((f, i, arr) => {
                const colors = ["var(--primary)", "var(--amber)", "var(--cyan)", "var(--violet)", "var(--green)"];
                const bgColors = ["var(--primary-light)", "var(--amber-light)", "var(--cyan-light)", "var(--violet-light)", "var(--green-light)"];
                return (
                  <div key={f.stage} className="flex items-center gap-0">
                    <div className="text-center px-5 py-2.5 rounded-[var(--radius-xs)]" style={{ backgroundColor: bgColors[i] ?? "var(--primary-light)" }}>
                      <div className="text-[22px] font-black font-mono text-[var(--text)]">{f.count}</div>
                      <div className="text-[11px] font-semibold" style={{ color: colors[i] ?? "var(--primary)" }}>{f.stage}</div>
                    </div>
                    {i < arr.length - 1 && <span className="text-base text-[var(--text-t)] mx-1">&#10148;</span>}
                  </div>
                );
              })}
            </div>

            {/* Re-analyze Button */}
            <div className="text-center">
              <button onClick={handleAnalyze} disabled={aiLoading}
                className="px-7 py-2.5 rounded-[var(--radius)] text-[13px] font-bold text-brand-500 bg-[var(--primary-light)] border border-[rgba(91,76,255,0.2)] hover:bg-brand-500 hover:text-white transition disabled:opacity-60">
                {aiLoading ? "AI 分析中..." : "✨ 重新分析"}
              </button>
            </div>
          </div>
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
