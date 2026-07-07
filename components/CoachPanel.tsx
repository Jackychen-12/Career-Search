"use client";

import { useState, useEffect } from "react";
import { fetchCoachAdvice, type CoachAdviceResult } from "@/lib/skills";

interface CoachPanelProps {
  trackingSummary: string;
  interviewSummary: string;
  profileSummary: string;
  newJobsSummary: string;
}

const CACHE_KEY = "coach_cache";
const CACHE_TTL = 24 * 60 * 60 * 1000;

function Icon({ d, size = 14, className = "" }: { d: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  sparkles: "M12 3v1m0 16v1m-8-9H3m18 0h-1m-2.636-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z",
  alert: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01",
  trending: "M23 6l-9.5 9.5-5-5L1 18",
  target: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 100 12 6 6 0 000-12zm0 4a2 2 0 100 4 2 2 0 000-4z",
  calendar: "M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18",
  chevronDown: "M6 9l6 6 6-6",
  refresh: "M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15",
};

export default function CoachPanel({ trackingSummary, interviewSummary, profileSummary, newJobsSummary }: CoachPanelProps) {
  const [data, setData] = useState<CoachAdviceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data: d, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) {
          setData(d);
          return;
        }
      } catch {}
    }
    if (profileSummary || trackingSummary) fetchCoach();
  }, []);

  async function fetchCoach() {
    setLoading(true);
    setError("");
    try {
      const result = await fetchCoachAdvice({
        profile: profileSummary,
        tracking: trackingSummary,
        interviews: interviewSummary,
        newJobs: newJobsSummary,
        today: new Date().toISOString().slice(0, 10),
      });
      setData(result);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, ts: Date.now() }));
    } catch (e) {
      setError((e as Error).message || "AI Coach \u6682\u65f6\u4e0d\u53ef\u7528");
    } finally {
      setLoading(false);
    }
  }

  if (collapsed) {
    return (
      <button onClick={() => setCollapsed(false)} className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-brand-500 text-white shadow-lg hover:bg-brand-600 transition grid place-items-center" title="AI Coach">
        <Icon d={ICONS.sparkles} size={20} />
      </button>
    );
  }

  return (
    <div className="card p-4 mb-4 border-brand-200 bg-gradient-to-br from-brand-50/50 to-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon d={ICONS.sparkles} size={16} className="text-brand-500" />
          <span className="text-sm font-bold text-gray-900">AI Coach</span>
          {data?.oneLineSummary && <span className="text-xs text-gray-400 ml-1 hidden sm:inline">{data.oneLineSummary}</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={fetchCoach} disabled={loading} className="p-1 rounded hover:bg-gray-100 text-gray-400 transition" title="\u5237\u65b0">
            <Icon d={ICONS.refresh} size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setCollapsed(true)} className="p-1 rounded hover:bg-gray-100 text-gray-400 transition" title="\u6536\u8d77">
            <Icon d={ICONS.chevronDown} size={14} />
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="text-center py-6 text-sm text-gray-400">
          <Icon d={ICONS.refresh} size={20} className="animate-spin mx-auto mb-2 text-brand-400" />
          \u6b63\u5728\u5206\u6790\u4f60\u7684\u6c42\u804c\u6570\u636e...
        </div>
      )}

      {error && <div className="text-xs text-red-500 mb-2">{error}</div>}

      {data && (
        <div className="space-y-3">
          {data.urgent.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-xs font-semibold text-orange-600 mb-1.5">
                <Icon d={ICONS.alert} size={12} /> \u7d27\u6025\u4e8b\u9879
              </div>
              {data.urgent.map((u, i) => (
                <div key={i} className="bg-orange-50 border border-orange-100 rounded-lg p-2.5 mb-1.5 text-xs">
                  <div className="font-semibold text-gray-900">{u.title}</div>
                  <div className="text-gray-500 mt-0.5">{u.reason}</div>
                  <div className="text-orange-600 font-medium mt-1">\u2192 {u.action}</div>
                </div>
              ))}
            </div>
          )}

          {(data.funnel.applied > 0 || data.funnel.interview > 0) && (
            <div>
              <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 mb-1.5">
                <Icon d={ICONS.trending} size={12} /> \u6295\u9012\u6f0f\u6597
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">\u6295\u9012 {data.funnel.applied}</span>
                <span className="text-gray-300">\u2192</span>
                <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-medium">\u7b14\u8bd5 {data.funnel.written}</span>
                <span className="text-gray-300">\u2192</span>
                <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded font-medium">\u9762\u8bd5 {data.funnel.interview}</span>
                <span className="text-gray-300">\u2192</span>
                <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded font-medium">Offer {data.funnel.offer}</span>
              </div>
            </div>
          )}

          {data.insights.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 mb-1.5">
                <Icon d={ICONS.trending} size={12} /> \u6d1e\u5bdf
              </div>
              {data.insights.map((ins, i) => (
                <div key={i} className="text-xs text-gray-600 mb-1">
                  <span className="font-medium text-gray-900">{ins.metric}\uff1a</span>{ins.value}
                  <span className="text-brand-600 ml-1">\u2192 {ins.suggestion}</span>
                </div>
              ))}
            </div>
          )}

          {data.recommended.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 mb-1.5">
                <Icon d={ICONS.target} size={12} /> \u63a8\u8350\u6295\u9012
              </div>
              {data.recommended.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="font-medium text-gray-900">{r.company}</span>
                    <span className="text-gray-400 ml-1">{r.title}</span>
                  </div>
                  <span className="text-brand-500 font-semibold">{r.matchScore}%</span>
                </div>
              ))}
            </div>
          )}

          {data.weeklyPlan && (
            <div>
              <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 mb-1.5">
                <Icon d={ICONS.calendar} size={12} /> \u672c\u5468\u8ba1\u5212
              </div>
              <div className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">{data.weeklyPlan}</div>
            </div>
          )}
        </div>
      )}

      {!data && !loading && !error && (
        <div className="text-center py-4">
          <button onClick={fetchCoach} className="text-xs text-brand-500 hover:text-brand-600 font-medium">
            \u70b9\u51fb\u83b7\u53d6 AI \u6c42\u804c\u5efa\u8bae
          </button>
        </div>
      )}
    </div>
  );
}
