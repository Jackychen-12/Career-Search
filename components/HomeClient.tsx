"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import CompareBar from "./CompareBar";
import FilterBar, { type FilterState } from "./FilterBar";
import Header from "./Header";
import JobCard from "./JobCard";
import Pagination from "./Pagination";
import Sidebar from "./Sidebar";

const CalendarView = dynamic(() => import("./CalendarView"), { loading: () => <SkeletonGrid /> });
const ComparePanel = dynamic(() => import("./ComparePanel"));
const PrefsPanel = dynamic(() => import("./PrefsPanel"));
const WeeklyPlan = dynamic(() => import("./WeeklyPlan"));

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card p-4 space-y-3 animate-pulse">
          <div className="h-4 bg-[rgba(0,0,0,.06)] rounded w-3/4" />
          <div className="h-3 bg-[rgba(0,0,0,.06)] rounded w-1/2" />
          <div className="h-16 bg-[rgba(0,0,0,.06)] rounded" />
          <div className="h-3 bg-[rgba(0,0,0,.06)] rounded w-full" />
        </div>
      ))}
    </div>
  );
}
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
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
  region: ["大陆"],
  keyword: "",
  urgentOnly: false,
  sort: "composite",
};

export default function HomeClient({
  initialJobs,
  totalCount,
  meta,
  now,
  newJobIds,
}: {
  initialJobs: Job[];
  totalCount: number;
  meta: JobsMeta | null;
  now: number;
  newJobIds: string[];
}) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [page, setPage] = useState(1);
  const [prefs, setPrefs] = useState<Prefs>(EMPTY_PREFS);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
  const [tracking, setTracking] = useState<TrackingData>({});
  const [loggedIn, setLoggedIn] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [weeklyOpen, setWeeklyOpen] = useState(false);

  useEffect(() => {
    if (totalCount > initialJobs.length) {
      fetch("/data/jobs.json")
        .then((r) => r.json())
        .then((all: Job[]) => setJobs(all))
        .catch(() => {});
    }
  }, [totalCount, initialJobs.length]);

  useEffect(() => {
    const p = loadPrefs();
    setPrefs(p);

    getSession().then((session) => {
      const isAuth = !!session;
      setLoggedIn(isAuth);
      if (isAuth) {
        loadTracking().then(setTracking);
        if (!hasPrefs(p) && typeof window !== "undefined" && !sessionStorage.getItem("skip-profile")) {
          window.location.href = "/profile/";
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        setLoggedIn(true);
        loadTracking().then(setTracking);
      } else if (event === "SIGNED_OUT") {
        setLoggedIn(false);
      }
    });

    return () => subscription.unsubscribe();
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
      <Header total={jobs.length} onOpenPrefs={() => setPrefsOpen(true)} onOpenWeekly={() => setWeeklyOpen(true)} />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <FilterBar
          state={filter}
          onChange={patch}
        />

        {/* Sort bar */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            共 <span className="text-gray-800 font-medium font-mono">{result.total}</span> 条
            {personalized && <span className="text-indigo-600 ml-1">· 个性化排序</span>}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setView("list")}
              className={`px-3 h-8 inline-flex items-center rounded-[var(--radius-xs)] text-[13px] transition ${
                view === "list" ? "bg-brand-500 text-white font-bold shadow-sm" : "text-gray-500 hover:text-brand-500 hover:bg-brand-50"
              }`}
            >
              列表
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`px-3 h-8 inline-flex items-center rounded-[var(--radius-xs)] text-[13px] transition ${
                view === "calendar" ? "bg-brand-500 text-white font-bold shadow-sm" : "text-gray-500 hover:text-brand-500 hover:bg-brand-50"
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
                <div className="card p-12 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[rgba(0,0,0,.06)] flex items-center justify-center text-gray-400">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                  </div>
                  <p className="text-sm text-gray-500">没有符合条件的岗位</p>
                  <p className="text-xs text-gray-400 mt-1">换个筛选试试</p>
                </div>
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
            <Sidebar jobs={jobs} now={now} newJobIds={newJobIds} prefs={prefs} tracking={tracking} onOpenWeekly={() => setWeeklyOpen(true)} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 text-xs text-gray-400 flex flex-wrap items-center justify-between gap-3">
          <span>数据来自公开招聘信息，投递以官方页面为准</span>
          <div className="flex items-center gap-4">
            <span className="text-gray-300">{meta?.fetchedAt ? new Date(meta.fetchedAt).toLocaleDateString("zh-CN") + " 更新" : ""}</span>
            <a href="https://github.com/Jackychen-12" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-600 transition font-medium">
              Made by Jacky
            </a>
            <a href="https://github.com/Jackychen-12/Career-Search" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-600 transition flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              Source
            </a>
          </div>
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
      <WeeklyPlan
        open={weeklyOpen}
        onClose={() => setWeeklyOpen(false)}
        jobs={jobs}
        prefs={prefs}
        tracking={tracking}
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
    </>
  );
}
