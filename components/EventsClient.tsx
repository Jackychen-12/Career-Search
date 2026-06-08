"use client";

import { useState } from "react";
import type { CampusEvent } from "@/lib/eventTypes";

const TYPE_COLORS: Record<string, string> = {
  宣讲会: "bg-brand-50 text-brand-600",
  网申: "bg-indigo-50 text-indigo-700",
  笔试: "bg-amber-50 text-amber-700",
  面试: "bg-rose-50 text-rose-700",
  其他: "bg-gray-100 text-gray-600",
};

export default function EventsClient({ events }: { events: CampusEvent[] }) {
  const [source, setSource] = useState<"all" | "清华" | "北大">("all");
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<CampusEvent["type"] | "all">("all");

  const filtered = events.filter((e) => {
    if (source !== "all" && e.source !== source) return false;
    if (typeFilter !== "all" && e.type !== typeFilter) return false;
    if (keyword.trim()) {
      const k = keyword.trim().toLowerCase();
      return e.company.toLowerCase().includes(k) || e.title.toLowerCase().includes(k) || (e.school ?? "").toLowerCase().includes(k);
    }
    return true;
  });

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = filtered.filter((e) => e.date >= today);
  const past = filtered.filter((e) => e.date < today);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/60 border-b border-black/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href={"/"} className="text-[15px] font-bold text-gray-900 hover:text-brand-600 transition">
              ← Career Search
            </a>
            <span className="text-gray-300">·</span>
            <span className="text-[14px] font-medium text-gray-700">宣讲 & 活动</span>
          </div>
          <span className="text-xs text-gray-400">{events.length} 条</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Search + filters */}
        <div className="card p-4 space-y-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索公司、活动名称..."
              className="w-full h-9 pl-9 pr-3 rounded-full border border-gray-200/80 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition"
            />
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">来源</span>
              {(["all", "清华", "北大"] as const).map((s) => (
                <button key={s} onClick={() => setSource(s)} className={`px-3 py-1.5 rounded-full text-[13px] transition ${source === s ? "bg-brand-500 text-white shadow-sm" : "text-gray-600 hover:bg-brand-50"}`}>
                  {s === "all" ? "全部" : s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">类型</span>
              {(["all", "宣讲会", "网申", "笔试", "面试", "其他"] as const).map((t) => (
                <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-full text-[13px] transition ${typeFilter === t ? "bg-brand-500 text-white shadow-sm" : "text-gray-600 hover:bg-brand-50"}`}>
                  {t === "all" ? "全部" : t}
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs text-gray-400">{filtered.length} 条结果</div>
        </div>

        {events.length === 0 ? (
          <div className="card p-12 text-center text-gray-500">
            <p className="text-lg font-medium mb-2">暂无宣讲会数据</p>
            <p className="text-sm text-gray-400">
              宣讲会信息来自清华/北大就业网，数据将在每日 crawl 时自动抓取。
              如果就业网暂时无法访问，这里会为空。
            </p>
          </div>
        ) : (
          <>
            {/* Upcoming */}
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-4 rounded-full bg-brand-500" />
                  即将举行（{upcoming.length}）
                </h2>
                <div className="space-y-2">
                  {upcoming.map((e) => (
                    <EventCard key={e.id} event={e} isUpcoming />
                  ))}
                </div>
              </section>
            )}

            {/* Past */}
            {past.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-4 rounded-full bg-gray-300" />
                  已结束（{past.length}）
                </h2>
                <div className="space-y-2 opacity-70">
                  {past.map((e) => (
                    <EventCard key={e.id} event={e} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function EventCard({ event, isUpcoming }: { event: CampusEvent; isUpcoming?: boolean }) {
  return (
    <a
      href={event.url}
      target="_blank"
      rel="noreferrer"
      className="card px-4 py-3 flex items-center gap-4 hover:border-brand-300 transition block"
    >
      {/* Date block */}
      <div className={`shrink-0 w-14 h-14 rounded-lg flex flex-col items-center justify-center ${isUpcoming ? "bg-brand-50" : "bg-gray-50"}`}>
        <span className={`text-lg font-bold ${isUpcoming ? "text-brand-600" : "text-gray-500"}`}>
          {event.date.slice(8, 10)}
        </span>
        <span className="text-[10px] text-gray-500">
          {event.date.slice(5, 7)}月
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-gray-900 truncate">{event.company}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[event.type] ?? TYPE_COLORS["其他"]}`}>
            {event.type}
          </span>
        </div>
        <div className="text-xs text-gray-600 mt-1">{event.title}</div>
        <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1">
          {event.time && <span>{event.time}</span>}
          {event.location && <span>{event.location}</span>}
          <span className="text-gray-400">· {event.source}</span>
        </div>
      </div>

      {/* Arrow */}
      <span className="shrink-0 text-gray-400 text-sm">→</span>
    </a>
  );
}
