"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CalendarView from "./CalendarView";
import CompareBar from "./CompareBar";
import ComparePanel from "./ComparePanel";
import FilterBar, { type FilterState } from "./FilterBar";
import Header from "./Header";
import JobCard from "./JobCard";
import Pagination from "./Pagination";
import PrefsPanel from "./PrefsPanel";
import Sidebar from "./Sidebar";
import StatBar from "./StatBar";
import TrackingPanel from "./TrackingPanel";
import { isLoggedIn } from "@/lib/auth";
import { queryJobs } from "@/lib/filter";
import { computeProfileMatchDetailed, type MatchResult } from "@/lib/matchScore";
import { EMPTY_PREFS, loadPrefs, savePrefs } from "@/lib/prefs";
import { hasPrefs } from "@/lib/ranking";
import { loadTracking, removeTracking, saveTracking, type TrackingData, type TrackingStatus } from "@/lib/tracker";
import type { Job, JobsMeta, Prefs } from "@/lib/types";

type ViewMode = "list" | "calendar";

const PAGE_SIZE = 12;

const DEFAULT_FILTER: FilterState = {
  categories: ["互联网", "金融", "快消", "实体", "管培"],
  cities: ["all"],
  jobTypes: ["all"],
  region: "大陆",
  keyword: "",
  urgentOnly: false,
  sort: "composite",
};

export default function HomeClient({
  jobs,
  meta,
  now,
  newJobIds,
}: {
  jobs: Job[];
  meta: JobsMeta | null;
  now: number;
  newJobIds: string[];
}) {
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [page, setPage] = useState(1);
  const [prefs, setPrefs] = useState<Prefs>(EMPTY_PREFS);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
  const [tracking, setTracking] = useState<TrackingData>({});
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
    const p = loadPrefs();
    setPrefs(p);
    setLoggedIn(isLoggedIn());
    if (isLoggedIn()) {
      loadTracking().then(setTracking);
      if (!hasPrefs(p) && typeof window !== "undefined") {
        window.location.href = (process.env.NEXT_PUBLIC_BASE_PATH || "") + "/profile/";
      }
    }
  }, []);

  function patch(p: Partial<FilterState>) {
    setFilter((f) => ({ ...f, ...p }));
    setPage(1);
  }

  const handleTrack = useCallback(async (jobId: string, status: TrackingStatus | null) => {
    if (status === null) {
      const data = await removeTracking(jobId);
      setTracking(data);
    } else {
      const data = await saveTracking(jobId, status);
      setTracking(data);
    }
  }, []);

  const handleCompareToggle = useCallback((jobId: string) => {
    setCompareIds((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : prev.length < 3 ? [...prev, jobId] : prev
    );
  }, []);

  const result = useMemo(
    () => queryJobs(jobs, { ...filter, prefs, page, pageSize: PAGE_SIZE }, new Date(now)),
    [jobs, filter, prefs, page, now],
  );

  const personalized = filter.sort === "composite" && hasPrefs(prefs);

  return (
    <>
      <Header total={jobs.length} onOpenTracking={() => setTrackingOpen(true)} onOpenPrefs={() => setPrefsOpen(true)} />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Stats + Filters (top, full width) */}
        <StatBar jobs={jobs} now={now} newCount={newJobIds.length} />
        <FilterBar
          state={filter}
          onChange={patch}
        />

        {/* Sort bar */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            共 <span className="text-gray-800 font-medium">{result.total}</span> 条
            {personalized && <span className="text-brand-600 ml-1">· 个性化排序</span>}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setView("list")}
              className={`px-3 h-8 inline-flex items-center rounded-full text-[13px] transition ${
                view === "list" ? "bg-brand-500 text-white shadow-sm" : "text-gray-500 hover:text-brand-600"
              }`}
            >
              列表
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`px-3 h-8 inline-flex items-center rounded-full text-[13px] transition ${
                view === "calendar" ? "bg-brand-500 text-white shadow-sm" : "text-gray-500 hover:text-brand-600"
              }`}
            >
              日历
            </button>
          </div>
        </div>

        {/* Content: left grid + right sidebar */}
        {view === "calendar" ? (
          <CalendarView jobs={jobs} now={now} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
            <section>
              {result.items.length === 0 ? (
                <div className="card p-12 text-center text-gray-400">没有符合条件的岗位，换个筛选试试。</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {result.items.map((j) => (
                    <JobCard
                      key={j.id}
                      job={j}
                      now={now}
                      isNew={newJobIds.includes(j.id)}
                      trackingStatus={tracking[j.id]?.status ?? null}
                      onTrack={loggedIn ? handleTrack : undefined}
                      matchResult={hasPrefs(prefs) ? computeProfileMatchDetailed(j, prefs) : undefined}
                      comparing={compareIds.includes(j.id)}
                      onCompareToggle={handleCompareToggle}
                    />
                  ))}
                </div>
              )}
              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                onPage={(p) => {
                  setPage(p);
                  if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </section>
            <Sidebar jobs={jobs} now={now} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-black/5 mt-10">
        <div className="max-w-7xl mx-auto px-4 py-6 text-xs text-gray-400 flex flex-wrap items-center justify-between gap-2">
          <span>数据来自公开招聘信息，投递以官方页面为准</span>
          <span>{meta?.fetchedAt ? new Date(meta.fetchedAt).toLocaleDateString("zh-CN") + " 更新" : ""}</span>
        </div>
      </footer>

      <PrefsPanel
        open={prefsOpen}
        prefs={prefs}
        onSave={(p) => {
          setPrefs(p);
          savePrefs(p);
          setPage(1);
          if (p.skills?.length || p.targetRoles?.length || p.resumeKeywords?.length) {
            setFilter((f) => ({ ...f, sort: "aiMatch" as const }));
          }
        }}
        onClose={() => setPrefsOpen(false)}
      />
      <CompareBar
        jobs={compareIds.map((id) => jobs.find((j) => j.id === id)!).filter(Boolean)}
        onRemove={(id) => setCompareIds((p) => p.filter((x) => x !== id))}
        onCompare={() => setCompareOpen(true)}
        onClear={() => setCompareIds([])}
      />
      <ComparePanel
        open={compareOpen}
        jobs={compareIds.map((id) => jobs.find((j) => j.id === id)!).filter(Boolean)}
        prefs={prefs}
        onClose={() => setCompareOpen(false)}
      />
      <TrackingPanel
        open={trackingOpen}
        onClose={() => setTrackingOpen(false)}
        tracking={tracking}
        jobs={jobs}
        onUpdate={setTracking}
      />
    </>
  );
}
