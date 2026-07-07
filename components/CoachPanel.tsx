"use client";

import { useState, useEffect } from "react";
import { Sparkles, AlertTriangle, TrendingUp, Target, Calendar, ChevronDown, RefreshCw } from "lucide-react";
import { fetchCoachAdvice, type CoachAdviceResult } from "@/lib/skills";

interface CoachPanelProps {
  trackingSummary: string;
  interviewSummary: string;
  profileSummary: string;
  newJobsSummary: string;
}

const CACHE_KEY = "coach_cache";
const CACHE_TTL = 24 * 60 * 60 * 1000;

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
      setError((e as Error).message || "AI Coach 暂时不可用");
    } finally {
      setLoading(false);
    }
  }

  if (collapsed) {
    return (
      <button onClick={() => setCollapsed(false)} className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-brand-500 text-white shadow-lg hover:bg-brand-600 transition grid place-items-center" title="AI Coach">
        <Sparkles size={20} />
      </button>
    );
  }

  return (
    <div className="card p-4 mb-4 border-brand-200 bg-gradient-to-br from-brand-50/50 to-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-brand-500" />
          <span className="text-sm font-bold text-gray-900">AI Coach</span>
          {data?.oneLineSummary && <span className="text-xs text-gray-400 ml-1 hidden sm:inline">{data.oneLineSummary}</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={fetchCoach} disabled={loading} className="p-1 rounded hover:bg-gray-100 text-gray-400 transition" title="刷新">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setCollapsed(true)} className="p-1 rounded hover:bg-gray-100 text-gray-400 transition" title="收起">
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="text-center py-6 text-sm text-gray-400">
          <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-brand-400" />
          正在分析你的求职数据...
        </div>
      )}

      {error && <div className="text-xs text-red-500 mb-2">{error}</div>}

      {data && (
        <div className="space-y-3">
          {data.urgent.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-xs font-semibold text-orange-600 mb-1.5">
                <AlertTriangle size={12} /> 紧急事项
              </div>
              {data.urgent.map((u, i) => (
                <div key={i} className="bg-orange-50 border border-orange-100 rounded-lg p-2.5 mb-1.5 text-xs">
                  <div className="font-semibold text-gray-900">{u.title}</div>
                  <div className="text-gray-500 mt-0.5">{u.reason}</div>
                  <div className="text-orange-600 font-medium mt-1">→ {u.action}</div>
                </div>
              ))}
            </div>
          )}

          {(data.funnel.applied > 0 || data.funnel.interview > 0) && (
            <div>
              <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 mb-1.5">
                <TrendingUp size={12} /> 投递漏斗
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">投递 {data.funnel.applied}</span>
                <span className="text-gray-300">→</span>
                <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-medium">笔试 {data.funnel.written}</span>
                <span className="text-gray-300">→</span>
                <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded font-medium">面试 {data.funnel.interview}</span>
                <span className="text-gray-300">→</span>
                <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded font-medium">Offer {data.funnel.offer}</span>
              </div>
            </div>
          )}

          {data.insights.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 mb-1.5">
                <TrendingUp size={12} /> 洞察
              </div>
              {data.insights.map((ins, i) => (
                <div key={i} className="text-xs text-gray-600 mb-1">
                  <span className="font-medium text-gray-900">{ins.metric}：</span>{ins.value}
                  <span className="text-brand-600 ml-1">→ {ins.suggestion}</span>
                </div>
              ))}
            </div>
          )}

          {data.recommended.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 mb-1.5">
                <Target size={12} /> 推荐投递
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
                <Calendar size={12} /> 本周计划
              </div>
              <div className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">{data.weeklyPlan}</div>
            </div>
          )}
        </div>
      )}

      {!data && !loading && !error && (
        <div className="text-center py-4">
          <button onClick={fetchCoach} className="text-xs text-brand-500 hover:text-brand-600 font-medium">
            点击获取 AI 求职建议
          </button>
        </div>
      )}
    </div>
  );
}
