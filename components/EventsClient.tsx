"use client";

import { useState } from "react";
import type { CampusEvent, WechatArticle } from "@/lib/eventTypes";

const INDUSTRY_MAP: Record<string, string> = {
  "百度": "互联网", "腾讯": "互联网", "阿里巴巴": "互联网", "阿里": "互联网", "字节跳动": "互联网",
  "美团": "互联网", "京东": "互联网", "快手": "互联网", "拼多多": "互联网", "小米": "互联网",
  "网易": "互联网", "滴滴": "互联网", "OPPO": "互联网", "vivo": "互联网", "大疆": "互联网",
  "小鹏汽车": "新能源", "蔚来": "新能源", "比亚迪": "新能源", "宁德时代": "新能源", "理想": "新能源",
  "华泰证券": "金融", "中金公司": "金融", "中信建投": "金融", "中信证券": "金融", "国泰君安": "金融",
  "招商银行": "金融", "华润银行": "金融", "南京银行": "金融", "工商银行": "金融", "中国银行": "金融",
  "光大证券": "金融", "长城证券": "金融", "中航证券": "金融",
  "华为": "科技", "联发科技": "科技", "矽力杰": "科技", "兆易创新": "科技",
  "南方电网": "央企", "国家电网": "央企", "中核集团": "央企", "中建集团": "央企",
  "中粮": "央企", "中国移动": "央企",
  "宝洁": "外企", "拜耳": "外企", "联合利华": "外企", "沃尔玛": "外企",
  "麦肯锡": "外企", "贝恩": "外企",
};

function getIndustry(company: string): string {
  for (const [key, val] of Object.entries(INDUSTRY_MAP)) {
    if (company.includes(key)) return val;
  }
  return "其他";
}

const INDUSTRY_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  "互联网": { bg: "bg-indigo-50", text: "text-indigo-700", bar: "from-indigo-400 to-indigo-600" },
  "金融": { bg: "bg-amber-50", text: "text-amber-700", bar: "from-amber-400 to-amber-600" },
  "央企": { bg: "bg-red-50", text: "text-red-700", bar: "from-red-400 to-red-600" },
  "外企": { bg: "bg-blue-50", text: "text-blue-700", bar: "from-blue-400 to-blue-600" },
  "新能源": { bg: "bg-green-50", text: "text-green-700", bar: "from-green-400 to-green-600" },
  "科技": { bg: "bg-violet-50", text: "text-violet-700", bar: "from-violet-400 to-violet-600" },
  "其他": { bg: "bg-gray-50", text: "text-gray-600", bar: "from-gray-300 to-gray-400" },
};

const TYPE_COLORS: Record<string, string> = {
  "宣讲会": "bg-teal-50 text-teal-700",
  "网申": "bg-indigo-50 text-indigo-700",
  "笔试": "bg-amber-50 text-amber-700",
  "面试": "bg-rose-50 text-rose-700",
  "其他": "bg-gray-100 text-gray-600",
};

const AVATAR_COLORS = [
  "bg-indigo-500", "bg-amber-500", "bg-rose-500", "bg-teal-500",
  "bg-violet-500", "bg-blue-500", "bg-green-500", "bg-orange-500",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function daysFromNow(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

type Tab = "events" | "articles";
const ARTICLES_PER_PAGE = 8;

export default function EventsClient({ events, articles = [] }: { events: CampusEvent[]; articles?: WechatArticle[] }) {
  const [tab, setTab] = useState<Tab>("events");
  const [source, setSource] = useState<"all" | "清华" | "北大" | "微信">("all");
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<CampusEvent["type"] | "all">("all");
  const [showPast, setShowPast] = useState(false);
  const [articlePage, setArticlePage] = useState(1);

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

  const articleTotalPages = Math.max(1, Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE));
  const clampedPage = Math.min(articlePage, articleTotalPages);
  const pagedArticles = filteredArticles.slice((clampedPage - 1) * ARTICLES_PER_PAGE, clampedPage * ARTICLES_PER_PAGE);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-black/5 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-[15px] font-bold text-gray-900 hover:text-gray-600 transition flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-500"><path d="M15 18l-6-6 6-6" /></svg>
              Career Search
            </a>
            <span className="text-gray-300">·</span>
            <span className="text-[15px] font-semibold text-gray-700">宣讲 & 资讯</span>
          </div>
          <span className="text-xs text-gray-400">{events.length} 活动 · {articles.length} 文章</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Tabs */}
        <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-lg w-fit">
          <button onClick={() => { setTab("events"); setArticlePage(1); }} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === "events" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
            宣讲活动（{events.length}）
          </button>
          <button onClick={() => { setTab("articles"); setArticlePage(1); }} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === "articles" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
            公众号推送（{articles.length}）
          </button>
        </div>

        {/* Search + Filters */}
        <div className="card p-4 space-y-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setArticlePage(1); }}
              placeholder={tab === "events" ? "搜索公司、活动名称..." : "搜索文章标题、公众号..."}
              className="w-full h-9 pl-9 pr-3 rounded-full border border-gray-200/80 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300/50 focus:border-gray-400 transition"
            />
          </div>
          {tab === "events" && (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">来源</span>
                {(["all", "微信", "清华", "北大"] as const).map((s) => (
                  <button key={s} onClick={() => setSource(s)} className={`px-3 py-1 rounded-full text-[12px] font-medium transition ${source === s ? "bg-white text-gray-900 shadow-sm border border-gray-300" : "text-gray-600 hover:bg-gray-100"}`}>
                    {s === "all" ? "全部" : s}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">类型</span>
                {(["all", "宣讲会", "网申", "笔试", "面试", "其他"] as const).map((t) => (
                  <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1 rounded-full text-[12px] font-medium transition ${typeFilter === t ? "bg-white text-gray-900 shadow-sm border border-gray-300" : "text-gray-600 hover:bg-gray-100"}`}>
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
            <div className="card p-12 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center text-gray-300">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              </div>
              <p className="text-sm text-gray-500">暂无符合条件的宣讲活动</p>
            </div>
          ) : (
            <div className="space-y-5">
              {upcoming.length > 0 && (
                <section>
                  <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-teal-500" /> 即将举行（{upcoming.length}）
                  </h2>
                  <div className="space-y-2">{upcoming.map((e) => <EventCard key={e.id} event={e} isUpcoming />)}</div>
                </section>
              )}
              {past.length > 0 && (
                <section>
                  <button
                    onClick={() => setShowPast(!showPast)}
                    className="flex items-center gap-2 text-base font-bold text-gray-500 hover:text-gray-700 transition mb-3"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      className={`transition-transform ${showPast ? "rotate-90" : ""}`}
                    ><path d="M9 18l6-6-6-6" /></svg>
                    <span className="w-1 h-4 rounded-full bg-gray-300" />
                    已结束（{past.length}）
                  </button>
                  {showPast && (
                    <div className="space-y-2 opacity-60">{past.map((e) => <EventCard key={e.id} event={e} />)}</div>
                  )}
                </section>
              )}
            </div>
          )
        )}

        {/* Articles tab */}
        {tab === "articles" && (
          filteredArticles.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center text-gray-300">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              </div>
              <p className="text-sm text-gray-500">暂无校招公众号文章</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {pagedArticles.map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>
              {articleTotalPages > 1 && (
                <nav className="flex items-center justify-center gap-1.5 mt-4">
                  <button
                    onClick={() => setArticlePage((p) => Math.max(1, p - 1))}
                    disabled={clampedPage <= 1}
                    className={`px-3 h-8 rounded-md text-xs border transition ${clampedPage <= 1 ? "border-gray-200 text-gray-300 cursor-not-allowed" : "border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-800 bg-white"}`}
                  >
                    ‹ 上一页
                  </button>
                  {Array.from({ length: articleTotalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setArticlePage(p)}
                      className={`min-w-[34px] h-8 px-2 rounded-md text-xs border transition ${p === clampedPage ? "border-gray-300 bg-white text-gray-900 shadow-sm font-semibold" : "border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-800 bg-white"}`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setArticlePage((p) => Math.min(articleTotalPages, p + 1))}
                    disabled={clampedPage >= articleTotalPages}
                    className={`px-3 h-8 rounded-md text-xs border transition ${clampedPage >= articleTotalPages ? "border-gray-200 text-gray-300 cursor-not-allowed" : "border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-800 bg-white"}`}
                  >
                    下一页 ›
                  </button>
                </nav>
              )}
            </>
          )
        )}
      </main>
    </div>
  );
}

function EventCard({ event, isUpcoming }: { event: CampusEvent; isUpcoming?: boolean }) {
  const industry = getIndustry(event.company);
  const colors = INDUSTRY_COLORS[industry] ?? INDUSTRY_COLORS["其他"];
  const days = daysFromNow(event.date);
  const isUrgent = isUpcoming && days >= 0 && days <= 3;

  return (
    <a href={event.url} target="_blank" rel="noreferrer" className="card p-0 overflow-hidden flex hover:border-gray-300 hover:shadow-md transition block">
      <div className={`w-1 shrink-0 bg-gradient-to-b ${colors.bar}`} />
      <div className="flex items-center gap-4 px-4 py-3 flex-1 min-w-0">
        <div className={`shrink-0 w-14 h-14 rounded-lg flex flex-col items-center justify-center ${isUpcoming ? "bg-gray-50" : "bg-gray-50"}`}>
          <span className={`text-lg font-bold ${isUpcoming ? "text-gray-900" : "text-gray-400"}`}>{event.date.slice(8, 10)}</span>
          <span className="text-[10px] text-gray-500">{event.date.slice(5, 7)}月</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-semibold text-gray-900 truncate">{event.company}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text}`}>{industry}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[event.type] ?? TYPE_COLORS["其他"]}`}>{event.type}</span>
          </div>
          <div className="text-xs text-gray-600 mt-1 line-clamp-1">{event.title}</div>
          <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1 flex-wrap">
            {event.time && <span>{event.time}</span>}
            {event.location && (
              <span className="truncate max-w-[160px] flex items-center gap-0.5">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                {event.location}
              </span>
            )}
            <span className="text-gray-400">· {event.source}</span>
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          {isUpcoming && days >= 0 && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              isUrgent
                ? "bg-red-50 text-red-600 animate-pulse"
                : days <= 7
                  ? "bg-amber-50 text-amber-600"
                  : "bg-gray-50 text-gray-500"
            }`}>
              {days === 0 ? "今天" : days === 1 ? "明天" : `${days}天后`}
            </span>
          )}
          <span className="text-gray-300 text-sm">→</span>
        </div>
      </div>
    </a>
  );
}

function ArticleCard({ article }: { article: WechatArticle }) {
  const firstChar = article.account.charAt(0);
  const bgColor = avatarColor(article.account);
  const days = daysFromNow(article.date);
  const dateLabel = days === 0 ? "今天" : days === -1 ? "昨天" : days > -7 ? `${Math.abs(days)}天前` : article.date.slice(5).replace("-", "/");

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noreferrer"
      className="card px-4 py-3 flex items-start gap-4 hover:border-gray-300 hover:shadow-sm transition block"
    >
      <div className={`shrink-0 w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center text-white text-lg font-bold`}>
        {firstChar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium text-gray-900 line-clamp-2">{article.title}</div>
        {article.summary && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{article.summary}</p>}
        <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1.5">
          <span className="font-medium text-gray-500">{article.account}</span>
          <span>{dateLabel}</span>
        </div>
      </div>
      <span className="shrink-0 text-gray-300 text-sm mt-1">→</span>
    </a>
  );
}
