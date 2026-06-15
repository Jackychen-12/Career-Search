"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Job } from "@/lib/types";
import type { TrackingData } from "@/lib/tracker";
import type { InterviewRecord } from "@/lib/interviews";
import { loadInterviews } from "@/lib/interviews";
import TrackingPageClient from "./TrackingPageClient";
import InterviewPageClient from "./InterviewPageClient";

const DashboardClient = dynamic(() => import("./DashboardClient").then((m) => ({ default: m.DashboardClient })), { ssr: false });

type Tab = "tracking" | "interview" | "dashboard";

export default function TrackingAndInterviewPage({ jobs }: { jobs: Job[] }) {
  const [tab, setTab] = useState<Tab>("tracking");
  const [syncVersion, setSyncVersion] = useState(0);
  const [sharedTracking, setSharedTracking] = useState<TrackingData>({});
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);

  useEffect(() => {
    loadInterviews().then(setInterviews);
  }, []);

  useEffect(() => {
    if (syncVersion > 0) {
      loadInterviews().then(setInterviews);
    }
  }, [syncVersion]);

  const onSyncChange = useCallback(() => {
    setSyncVersion((v) => v + 1);
  }, []);

  const onTrackingLoaded = useCallback((data: TrackingData) => {
    setSharedTracking(data);
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: "tracking", label: "我的投递" },
    { key: "interview", label: "面试记录" },
    { key: "dashboard", label: "数据看板" },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/60 border-b border-black/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-[15px] font-bold text-gray-900 hover:text-brand-600 transition">← Career Search</a>
            <span className="text-gray-300">·</span>
            <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-lg">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3.5 py-1 rounded-md text-sm font-medium transition ${tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {tab === "tracking" && (
        <TrackingPageClient jobs={jobs} hideHeader interviews={interviews} syncVersion={syncVersion} onSyncChange={onSyncChange} onTrackingLoaded={onTrackingLoaded} />
      )}
      {tab === "interview" && (
        <InterviewPageClient hideHeader jobs={jobs} tracking={sharedTracking} syncVersion={syncVersion} onSyncChange={onSyncChange} />
      )}
      {tab === "dashboard" && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <DashboardClient tracking={sharedTracking} interviews={interviews} />
        </div>
      )}
    </div>
  );
}
