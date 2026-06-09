"use client";

import { useState } from "react";
import type { CampusEvent, WechatArticle } from "@/lib/eventTypes";

const TYPE_COLORS: Record<string, string> = {
  宣讲会: "bg-brand-50 text-brand-600",
  网申: "bg-indigo-50 text-indigo-700",
  笔试: "bg-amber-50 text-amber-700",
  面试: "bg-rose-50 text-rose-700",
  其他: "bg-gray-100 text-gray-600",
};

type Tab = "events" | "articles";

export default function EventsClient({ events, articles = [] }: { events: CampusEvent[]; articles?: WechatArticle[] }) {
  const [tab, setTab] = useState<Tab>("events");
  const [source, setSource] = useState<"all" | "清华" | "北大" | "微信">("all");
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<CampusEvent["type"] | "all">("all");

  const filteredEvents = events.filter((e) => {
    if (source !== "all" && e.source !== source) return false;
    if (typeFilter !== "all" && e.type !== typeFilter) return false;
    if (keyword.trim()) {
      const k = keyword.trim().toLowerCase();
      return e.company.toLowerCase().includes(k) || e.title.toLowerCase().includes(k);
    }
    return true;
  });

  const filteredArticles = articles.filter((a) => {
    if (!keyword.trim()) return true;
    const k = keyword.trim().toLowerCase();
    return a.title.toLowerCase().includes(k) || a.account.toLowerCase().includes(k) || (a.summary ?? "").toLowerCase().includes(k);
  });

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = filteredEvents.filter((e) => e.date >= today);
  const past = filteredEvents.filter((e) => e.date < today);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/60 border-b border-black/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-[15px] font-bold text-gray-900 hover:text-brand-600 transition">← Career Search</a>
            <span className="text-gray-300">·</span>
            <span className="text-[14px] font-medium text-gray-700">宣讲 & 资讯</span>
          </div>
          <span className="text-xs text-gray-400">{events.length} 活动 · {articles.length} 文章</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Tabs */}
        <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-lg w-fit">
          <button onClick={() => setTab("events")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === "events" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
            宣讲活动 ({events.length})
          </button>
          <button onClick={() => setTab("articles")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === "articles" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
            公众号推送 ({articles.length})
          </button>
        </div>

        {/* Search + filters */}
        <div className="card p-4 space-y-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={tab === "events" ? "搜索公司、活动名称..." : "搜索文章标题、公众号..."}
              className="w-full h-9 pl-9 pr-3 rounded-full border border-gray-200/80 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition"
            />
          </div>
          {tab === "events" && (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">来源</span>
                {(["all", "微信", "清华", "北大"] as const).map((s) => (
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
          )}
          <div className="text-xs text-gray-400">
            {tab === "events" ? `${filteredEvents.length} 条活动` : `${filteredArticles.length} 篇文章`}
          </div>
        </div>

        {/* Events tab */}
        {tab === "events" && (
          filteredEvents.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">暂无符合条件的宣讲活动</div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <section>
                  <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-4 rounded-full bg-brand-500" /> 即将举行（{upcoming.length}）
                  </h2>
                  <div className="space-y-2">{upcoming.map((e) => <EventCard key={e.id} event={e} isUpcoming />)}</div>
                </section>
              )}
              {past.length > 0 && (
                <section>
                  <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-4 rounded-full bg-gray-300" /> 已结束（{past.length}）
                  </h2>
                  <div className="space-y-2 opacity-70">{past.map((e) => <EventCard key={e.id} event={e} />)}</div>
                </section>
              )}
            </>
          )
        )}

        {/* Articles tab */}
        {tab === "articles" && (
          filteredArticles.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">暂无校招公众号文章</div>
          ) : (
            <div className="space-y-2">
              {filteredArticles.map((a) => (
                <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="card px-4 py-3 flex items-start gap-4 hover:border-brand-300 transition block">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 text-lg">W</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium text-gray-900 line-clamp-2">{a.title}</div>
                    {a.summary && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.summary}</p>}
                    <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1.5">
                      <span>{a.account}</span>
                      <span>{a.date}</span>
                    </div>
                  </div>
                  <span className="shrink-0 text-gray-300 text-sm mt-1">→</span>
                </a>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
}

function EventCard({ event, isUpcoming }: { event: CampusEvent; isUpcoming?: boolean }) {
  return (
    <a href={event.url} target="_blank" rel="noreferrer" className="card px-4 py-3 flex items-center gap-4 hover:border-brand-300 transition block">
      <div className={`shrink-0 w-14 h-14 rounded-lg flex flex-col items-center justify-center ${isUpcoming ? "bg-brand-50" : "bg-gray-50"}`}>
        <span className={`text-lg font-bold ${isUpcoming ? "text-brand-600" : "text-gray-500"}`}>{event.date.slice(8, 10)}</span>
        <span className="text-[10px] text-gray-500">{event.date.slice(5, 7)}月</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-gray-900 truncate">{event.company}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[event.type] ?? TYPE_COLORS["其他"]}`}>{event.type}</span>
        </div>
        <div className="text-xs text-gray-600 mt-1 line-clamp-1">{event.title}</div>
        <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1">
          {event.time && <span>{event.time}</span>}
          {event.location && <span>{event.location}</span>}
          <span className="text-gray-400">· {event.source}</span>
        </div>
      </div>
      <span className="shrink-0 text-gray-400 text-sm">→</span>
    </a>
  );
}
