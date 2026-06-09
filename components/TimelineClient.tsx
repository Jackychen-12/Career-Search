"use client";

import { useEffect, useState } from "react";
import { loadTracking, type TrackingData, type TrackingStatus } from "@/lib/tracker";
import { getSession } from "@/lib/auth";
import type { Job } from "@/lib/types";

const STATUS_CONFIG: Record<TrackingStatus, { label: string; color: string; bg: string; order: number }> = {
  saved:     { label: "收藏",   color: "text-gray-600",  bg: "bg-gray-200",  order: 0 },
  applied:   { label: "已投递", color: "text-blue-600",  bg: "bg-blue-500",  order: 1 },
  written:   { label: "笔试",   color: "text-indigo-600",bg: "bg-indigo-500",order: 2 },
  interview: { label: "面试",   color: "text-amber-600", bg: "bg-amber-500", order: 3 },
  hr:        { label: "HR面",   color: "text-orange-600",bg: "bg-orange-500",order: 4 },
  offer:     { label: "Offer",  color: "text-brand-600", bg: "bg-brand-500", order: 5 },
  rejected:  { label: "已拒",   color: "text-red-500",   bg: "bg-red-400",   order: 6 },
  withdrawn: { label: "放弃",   color: "text-gray-400",  bg: "bg-gray-300",  order: 7 },
};

interface TimelineItem {
  job: Job;
  status: TrackingStatus;
  appliedAt?: string;
  interviewAt?: string;
  offerAt?: string;
  updatedAt: string;
  notes?: string;
}

export default function TimelineClient({ jobs }: { jobs: Job[] }) {
  const [tracking, setTracking] = useState<TrackingData>({});
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    getSession().then((s) => {
      setLoggedIn(!!s);
      if (s) loadTracking().then(setTracking);
    });
  }, []);

  const items: TimelineItem[] = Object.entries(tracking)
    .map(([id, entry]) => {
      const job = jobs.find((j) => j.id === id);
      if (!job) return null;
      return { job, ...entry };
    })
    .filter((x): x is TimelineItem => x !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  // Group by status for summary
  const statusCounts: Record<string, number> = {};
  items.forEach((i) => { statusCounts[i.status] = (statusCounts[i.status] ?? 0) + 1; });

  // Build timeline events sorted by date
  const events: { date: string; company: string; action: string; status: TrackingStatus; jobId: string }[] = [];
  for (const item of items) {
    if (item.appliedAt) events.push({ date: item.appliedAt, company: item.job.company, action: `投递 ${item.job.title}`, status: "applied", jobId: item.job.id });
    if (item.interviewAt) events.push({ date: item.interviewAt, company: item.job.company, action: `面试 ${item.job.title}`, status: "interview", jobId: item.job.id });
    if (item.offerAt) events.push({ date: item.offerAt, company: item.job.company, action: `Offer ${item.job.title}`, status: "offer", jobId: item.job.id });
    if (!item.appliedAt && !item.interviewAt && !item.offerAt) {
      events.push({ date: item.updatedAt.slice(0, 10), company: item.job.company, action: `${STATUS_CONFIG[item.status].label} ${item.job.title}`, status: item.status, jobId: item.job.id });
    }
  }
  events.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/60 border-b border-black/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-[15px] font-bold text-gray-900 hover:text-brand-600 transition">← Career Search</a>
            <span className="text-gray-300">·</span>
            <span className="text-[14px] font-medium text-gray-700">求职时间线</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {!loggedIn ? (
          <div className="card p-12 text-center text-gray-400">请先登录查看你的求职时间线</div>
        ) : items.length === 0 ? (
          <div className="card p-12 text-center text-gray-400">还没有追踪任何岗位，去首页收藏一些岗位吧</div>
        ) : (
          <>
            {/* Status summary bar */}
            <div className="flex flex-wrap gap-2">
              {(Object.entries(STATUS_CONFIG) as [TrackingStatus, typeof STATUS_CONFIG[TrackingStatus]][]).map(([key, cfg]) => {
                const count = statusCounts[key] ?? 0;
                if (count === 0) return null;
                return (
                  <div key={key} className="card px-3 py-2 flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${cfg.bg}`} />
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                    <span className="text-xs text-gray-500">{cfg.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Gantt-like bars */}
            <div className="card p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4">进度概览</h3>
              <div className="space-y-2">
                {items.filter((i) => i.status !== "saved").map((item) => {
                  const cfg = STATUS_CONFIG[item.status];
                  const progress = (cfg.order / 5) * 100;
                  return (
                    <div key={item.job.id} className="flex items-center gap-3">
                      <a href={`/job/${item.job.id}`} className="text-xs font-medium text-gray-700 w-24 truncate hover:text-brand-600">{item.job.company}</a>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative">
                        <div className={`h-full rounded-full ${cfg.bg} transition-all`} style={{ width: `${Math.max(15, progress)}%` }} />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white mix-blend-difference">
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Timeline */}
            <div className="card p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4">时间线</h3>
              <div className="relative">
                <div className="absolute left-[15px] top-0 bottom-0 w-px bg-gray-200" />
                <div className="space-y-4">
                  {events.map((e, i) => {
                    const cfg = STATUS_CONFIG[e.status];
                    return (
                      <div key={i} className="flex items-start gap-4 relative">
                        <div className={`shrink-0 w-[31px] h-[31px] rounded-full border-2 border-white ${cfg.bg} flex items-center justify-center z-10`}>
                          <span className="text-white text-[9px] font-bold">{cfg.label.slice(0, 1)}</span>
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="text-sm font-medium text-gray-900">{e.company}</div>
                          <div className="text-xs text-gray-600 mt-0.5">{e.action}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">{e.date}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
