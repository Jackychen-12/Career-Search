"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CalendarView from "./CalendarView";
import FilterBar, { type FilterState } from "./FilterBar";
import Header from "./Header";
import JobCard from "./JobCard";
import Pagination from "./Pagination";
import PrefsPanel from "./PrefsPanel";
import SourceStatusBanner from "./SourceStatusBanner";
import StatBar from "./StatBar";
import TrackingPanel from "./TrackingPanel";
import { isLoggedIn } from "@/lib/auth";
import { queryJobs } from "@/lib/filter";
import { EMPTY_PREFS, loadPrefs, savePrefs } from "@/lib/prefs";
import { hasPrefs } from "@/lib/ranking";
import { loadTracking, removeTracking, saveTracking, type TrackingData, type TrackingStatus } from "@/lib/tracker";
import type { Job, JobsMeta, Prefs } from "@/lib/types";

type ViewMode = "list" | "calendar";

const PAGE_SIZE = 12;

const DEFAULT_FILTER: FilterState = {
  category: "all",
  city: "all",
  jobType: "all",
  region: "all",
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

  useEffect(() => {
    setPrefs(loadPrefs());
    setLoggedIn(isLoggedIn());
    if (isLoggedIn()) {
      loadTracking().then(setTracking);
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

  const result = useMemo(
    () => queryJobs(jobs, { ...filter, prefs, page, pageSize: PAGE_SIZE }, new Date(now)),
    [jobs, filter, prefs, page, now],
  );

  const personalized = filter.sort === "composite" && hasPrefs(prefs);

  return (
    <div className="min-h-screen">
      <Header total={jobs.length} onOpenTracking={() => setTrackingOpen(true)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        <StatBar jobs={jobs} now={now} newCount={newJobIds.length} />
        <FilterBar
          state={filter}
          onChange={patch}
          onOpenPrefs={() => setPrefsOpen(true)}
          prefsActive={hasPrefs(prefs)}
        />

        {/* Results control bar */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">
            <span className="font-mono font-medium text-slate-800">{result.total}</span> 条结果
            {personalized && <span className="text-cyan-600 ml-1.5">· 个性化排序</span>}
          </div>
          <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-md">
            <button
              onClick={() => setView("list")}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${view === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            >
              列表
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${view === "calendar" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            >
              日历
            </button>
          </div>
        </div>

        {/* Content area */}
        {view === "calendar" ? (
          <CalendarView jobs={jobs} now={now} />
        ) : (
          <>
            {result.items.length === 0 ? (
              <div className="card p-16 text-center text-sm text-slate-400">
                没有符合条件的岗位，试试放宽筛选。
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 grid-animate">
                {result.items.map((j) => (
                  <JobCard
                    key={j.id}
                    job={j}
                    now={now}
                    isNew={newJobIds.includes(j.id)}
                    trackingStatus={tracking[j.id]?.status ?? null}
                    onTrack={loggedIn ? handleTrack : undefined}
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
          </>
        )}

        <SourceStatusBanner meta={meta} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-[11px] text-slate-400 flex justify-between">
          <span>数据来源公开招聘信息，投递以官方页面为准</span>
          <span className="font-mono">{meta?.fetchedAt ? new Date(meta.fetchedAt).toLocaleDateString("zh-CN") + " synced" : ""}</span>
        </div>
      </footer>

      <PrefsPanel
        open={prefsOpen}
        prefs={prefs}
        onSave={(p) => { setPrefs(p); savePrefs(p); setPage(1); }}
        onClose={() => setPrefsOpen(false)}
      />
      <TrackingPanel
        open={trackingOpen}
        onClose={() => setTrackingOpen(false)}
        tracking={tracking}
        jobs={jobs}
      />
    </div>
  );
}
