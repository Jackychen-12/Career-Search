"use client";

import { useState } from "react";
import type { Job } from "@/lib/types";
import TrackingPageClient from "./TrackingPageClient";
import InterviewPageClient from "./InterviewPageClient";

type Tab = "tracking" | "interview";

export default function TrackingAndInterviewPage({ jobs }: { jobs: Job[] }) {
  const [tab, setTab] = useState<Tab>("tracking");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/60 border-b border-black/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-[15px] font-bold text-gray-900 hover:text-brand-600 transition">← Career Search</a>
            <span className="text-gray-300">·</span>
            <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-lg">
              <button
                onClick={() => setTab("tracking")}
                className={`px-3.5 py-1 rounded-md text-sm font-medium transition ${tab === "tracking" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                我的投递
              </button>
              <button
                onClick={() => setTab("interview")}
                className={`px-3.5 py-1 rounded-md text-sm font-medium transition ${tab === "interview" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                面试记录
              </button>
            </div>
          </div>
        </div>
      </header>

      {tab === "tracking" ? (
        <TrackingPageClient jobs={jobs} hideHeader />
      ) : (
        <InterviewPageClient hideHeader />
      )}
    </div>
  );
}
