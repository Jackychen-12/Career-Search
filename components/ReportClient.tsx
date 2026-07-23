"use client";

import { useEffect, useMemo, useState } from "react";
import { loadPrefs } from "@/lib/prefs";
import { hasPrefs } from "@/lib/ranking";
import { computeProfileMatchDetailed } from "@/lib/matchScore";
import { daysUntil } from "@/lib/scoring";
import { getSession } from "@/lib/auth";
import { loadTracking, type TrackingData } from "@/lib/tracker";
import { loadInterviews, type InterviewRecord, type InterviewRound } from "@/lib/interviews";
import { computeDashboardStats, type DashboardStats } from "@/lib/dashboardStats";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { InterviewCalendar } from "@/components/charts/InterviewCalendar";
import type { Job, Prefs } from "@/lib/types";

const INDUSTRY_COLORS: Record<string, string> = {
  "互联网": "#5b4cff", "金融": "#F59E0B", "外企": "#10B981",
  "快消": "#F97316", "管培": "#8B5CF6", "实体": "#78716c", "其他": "#9CA3AF",
};

function computeCompositeScore(
  matchAvg: number,
  stats: DashboardStats | null,
  interviews: InterviewRecord[],
): { total: number; match: number; progress: number; interview: number } {
  const match = Math.round(matchAvg * 100);
  const progress = stats
    ? Math.min(100, Math.round((Math.min(stats.total, 20) / 20) * 40 + Math.min(stats.offerRate, 30) / 30 * 60))
    : 0;
  const allRounds = interviews.flatMap((iv) => iv.rounds);
  const passedRounds = allRounds.filter((r) => r.result === "通过").length;
  const iv = allRounds.length > 0 ? Math.round((passedRounds / allRounds.length) * 100) : 0;
  const total = stats
    ? Math.round(0.4 * match + 0.3 * progress + 0.3 * iv)
    : match;
  return { total, match, progress, interview: iv };
}

function SectionHeading({ children, barColor }: { children: React.ReactNode; barColor?: string }) {
  return (
    <h2 className="text-base font-black tracking-tight text-[var(--text)] mb-4 flex items-center gap-2">
      <span className="w-[3px] h-[18px] rounded-full flex-shrink-0" style={{ background: barColor ?? "var(--primary, #5b4cff)" }} />
      {children}
    </h2>
  );
}

export default function ReportClient({ jobs }: { jobs: Job[] }) {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [activeBucket, setActiveBucket] = useState<string | null>(null);
  const [tracking, setTracking] = useState<TrackingData>({});
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const p = loadPrefs();
    if (hasPrefs(p)) setPrefs(p);
    getSession().then((s) => {
      setLoggedIn(!!s);
      if (s) {
        Promise.all([loadTracking(), loadInterviews()]).then(([t, i]) => {
          setTracking(t);
          setInterviews(i);
          setStats(computeDashboardStats(t, i));
          setLoaded(true);
        });
      } else {
        setLoaded(true);
      }
    });
  }, []);

  const analysis = useMemo(() => {
    if (!prefs) return null;
    const matches = jobs
      .map((j) => ({ job: j, ...computeProfileMatchDetailed(j, prefs) }))
      .sort((a, b) => b.score - a.score);

    const high = matches.filter((m) => m.score > 0.6);
    const mid = matches.filter((m) => m.score > 0.3 && m.score <= 0.6);
    const low = matches.filter((m) => m.score > 0 && m.score <= 0.3);
    const none = matches.filter((m) => m.score === 0);

    const skillCount: Record<string, number> = {};
    for (const j of jobs) {
      for (const s of j.aiTags?.skills ?? []) {
        skillCount[s] = (skillCount[s] ?? 0) + 1;
      }
    }
    const topMarketSkills = Object.entries(skillCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([skill, count]) => ({ skill, count }));

    const userSkills = new Set(
      [...(prefs.skills ?? []), ...(prefs.resumeKeywords ?? [])].map((s) => s.toLowerCase()),
    );
    const skillGaps = topMarketSkills.filter((s) => !userSkills.has(s.skill.toLowerCase()));
    const skillMatches = topMarketSkills.filter((s) => userSkills.has(s.skill.toLowerCase()));

    const industryDist: Record<string, number> = {};
    for (const m of high) {
      const ind = m.job.aiTags?.industry ?? m.job.category;
      industryDist[ind] = (industryDist[ind] ?? 0) + 1;
    }

    const now = new Date();
    const urgentTop = matches
      .filter((m) => m.score > 0.3 && m.job.deadline)
      .map((m) => ({ ...m, daysLeft: daysUntil(m.job.deadline, now) }))
      .filter((m) => m.daysLeft !== null && m.daysLeft >= 0 && m.daysLeft <= 30)
      .sort((a, b) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99))
      .slice(0, 8);

    const matchAvg =
      matches.length > 0
        ? matches.slice(0, Math.min(20, matches.length)).reduce((s, m) => s + m.score, 0) /
          Math.min(20, matches.length)
        : 0;

    return { matches, high, mid, low, none, topMarketSkills, skillGaps, skillMatches, industryDist, urgentTop, matchAvg };
  }, [jobs, prefs]);

  // ── Empty state ──
  if (!prefs) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-[var(--surface-solid)]/80 border-b border-[var(--border)]">
          <div className="max-w-[900px] mx-auto px-4 sm:px-6 h-14 flex items-center">
            <a href="/" className="text-[15px] font-bold text-[var(--text)]">← Career Search</a>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl mb-4">📊</div>
            <h2 className="text-lg font-black tracking-tight text-[var(--text)] mb-2">尚未设置求职画像</h2>
            <p className="text-sm text-[var(--text-s)] mb-4">请先在首页点击「设置画像」或上传简历，才能生成求职报告。</p>
            <a href="/" className="px-4 py-2 rounded-[var(--radius-xs)] text-sm font-medium bg-brand-500 text-white transition">返回首页设置</a>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) return null;
  const { high, mid, low, none, matches, topMarketSkills, skillGaps, skillMatches, industryDist, urgentTop, matchAvg } = analysis;
  const composite = computeCompositeScore(matchAvg, stats, interviews);
  const total = matches.length;

  // Donut segments
  const donutData = [
    { count: high.length, color: "var(--primary, #5b4cff)" },
    { count: mid.length, color: "#a5b4fc" },
    { count: low.length, color: "rgba(0,0,0,0.10)" },
    { count: none.length, color: "rgba(0,0,0,0.04)" },
  ];
  const donutR = 52;
  const donutCirc = 2 * Math.PI * donutR;

  // Interview insights
  const allRounds = interviews.flatMap((iv) => iv.rounds);
  const passedRounds = allRounds.filter((r) => r.result === "通过");
  const ivPassRate = allRounds.length > 0 ? Math.round((passedRounds.length / allRounds.length) * 100) : 0;
  const offerCount = interviews.filter((iv) => iv.status === "已拿offer").length;
  const ivOfferRate = interviews.length > 0 ? Math.round((offerCount / interviews.length) * 100) : 0;
  const avgFeeling = (() => {
    const feelings = allRounds.map((r) => r.feeling).filter((f) => f !== "");
    if (feelings.length === 0) return "—";
    const good = feelings.filter((f) => f === "好").length;
    const bad = feelings.filter((f) => f === "差").length;
    if (good > feelings.length / 2) return "好";
    if (bad > feelings.length / 2) return "差";
    return "一般";
  })();

  const bestRound = allRounds.find((r) => r.result === "通过" && r.feeling === "好");
  const worstRound = allRounds.find((r) => (r.feeling === "一般" || r.feeling === "差") && r.result !== "通过");
  const bestIv = bestRound ? interviews.find((iv) => iv.rounds.includes(bestRound)) : null;
  const worstIv = worstRound ? interviews.find((iv) => iv.rounds.includes(worstRound)) : null;

  const questionTypes = (() => {
    const types = new Set<string>();
    for (const r of allRounds) {
      for (const q of r.questions) {
        if (/产品|设计/.test(q)) types.add("产品设计");
        if (/行为|团队|冲突/.test(q)) types.add("行为面试");
        if (/算法|代码|编程/.test(q)) types.add("技术编程");
        if (/数据|SQL|分析/.test(q)) types.add("数据分析");
        if (/业务|商业/.test(q)) types.add("业务理解");
        if (/Case|案例/.test(q)) types.add("Case Study");
      }
    }
    if (types.size === 0) {
      const roles = prefs.targetRoles ?? [];
      if (roles.some((r) => /产品/.test(r))) types.add("产品设计");
      if (roles.some((r) => /数据|分析/.test(r))) types.add("数据分析");
      if (roles.some((r) => /管培/.test(r))) types.add("行为面试");
      types.add("业务理解");
    }
    return Array.from(types);
  })();

  // Weekly plan: top 3 not-yet-applied urgent jobs
  const appliedIds = new Set(
    Object.entries(tracking)
      .filter(([, v]) => v.status !== "saved")
      .map(([k]) => k),
  );
  const weeklyJobs = matches
    .filter((m) => m.score > 0.3 && !appliedIds.has(m.job.id))
    .map((m) => ({ ...m, daysLeft: daysUntil(m.job.deadline, new Date()) }))
    .sort((a, b) => {
      const ua = a.daysLeft !== null && a.daysLeft >= 0 && a.daysLeft <= 7 ? 0 : a.daysLeft !== null && a.daysLeft >= 0 ? 1 : 2;
      const ub = b.daysLeft !== null && b.daysLeft >= 0 && b.daysLeft <= 7 ? 0 : b.daysLeft !== null && b.daysLeft >= 0 ? 1 : 2;
      if (ua !== ub) return ua - ub;
      return b.score - a.score;
    })
    .slice(0, 3);

  // Gauge arc
  const gaugeR = 80;
  const gaugeCirc = 2 * Math.PI * gaugeR;
  const gaugeOffset = gaugeCirc * (1 - composite.total / 100);

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-[var(--surface)] backdrop-blur-[8px] [backdrop-filter:blur(8px)_saturate(180%)] border-b border-[var(--border)] shadow-[var(--shadow-sm)]">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-[15px] font-black tracking-tight text-[var(--text)] hover:text-brand-500 transition">← Career Search</a>
            <span className="text-[var(--text-t)]">·</span>
            <span className="text-[14px] font-bold text-[var(--text)]">求职全景报告</span>
          </div>
          <div className="flex items-center gap-3 print:hidden">
            <button
              onClick={() => navigator.clipboard.writeText(window.location.href).then(() => alert("链接已复制"))}
              className="text-[13px] font-semibold text-[var(--text-s)] hover:text-brand-500 transition"
            >
              分享
            </button>
            <button onClick={() => window.print()} className="text-[13px] font-semibold text-[var(--text-s)] hover:text-brand-500 transition">
              导出 PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ═══ 1. Hero 综合评分 ═══ */}
        <section className="card p-8 text-center">
          <div className="text-[11px] font-bold text-[var(--text-t)] uppercase tracking-widest mb-4">求职力综合评分</div>
          <div className="inline-block relative" style={{ width: 180, height: 180 }}>
            <svg viewBox="0 0 200 200" width="180" height="180">
              <defs>
                <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#5b4cff" />
                  <stop offset="100%" stopColor="#1ABCFE" />
                </linearGradient>
              </defs>
              <circle cx="100" cy="100" r={gaugeR} fill="none" stroke="rgba(0,0,0,.04)" strokeWidth="10" />
              <circle
                cx="100" cy="100" r={gaugeR} fill="none"
                stroke="url(#gaugeGrad)" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={gaugeCirc} strokeDashoffset={gaugeOffset}
                transform="rotate(-90 100 100)"
                className="transition-all duration-[1200ms] ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[48px] font-black font-mono text-[var(--text)] leading-none">{composite.total}</span>
              <span className="text-sm text-[var(--text-t)] mt-0.5">/ 100</span>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-5 flex-wrap">
            {[
              { label: "画像匹配", value: composite.match, color: "var(--primary, #5b4cff)" },
              { label: "投递进展", value: composite.progress, color: "var(--cyan, #1ABCFE)" },
              { label: "面试表现", value: composite.interview, color: "var(--green, #10B981)" },
            ].map((d) => (
              <div key={d.label} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: d.color }} />
                <span className="text-[11px] text-[var(--text-s)]">{d.label}</span>
                <span className="text-[13px] font-extrabold font-mono text-[var(--text)]">{d.value}%</span>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-[var(--text-t)] mt-3">
            基于 {jobs.length} 个岗位 · {Object.keys(tracking).length} 条投递 · {allRounds.length} 轮面试
          </div>
        </section>

        {/* ═══ 2. KPI 卡片条 ═══ */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "总追踪", value: stats ? String(stats.total) : "—", color: "var(--text)", trend: stats && stats.weeklyActivity > 0 ? `本周 +${stats.weeklyActivity}` : null, trendColor: "var(--green)" },
            { label: "Offer 率", value: stats ? `${stats.offerRate}%` : "—", color: "var(--green)", trend: stats && stats.offerRate > 10 ? "↑ 高于均值" : null, trendColor: "var(--green)" },
            { label: "平均面试轮", value: stats ? String(stats.avgRoundsToOffer || "—") : "—", color: "var(--primary)", trend: "到 Offer", trendColor: "var(--text-t)" },
            { label: "本周活跃", value: stats ? String(stats.weeklyActivity) : "—", color: "var(--cyan)", trend: "次操作", trendColor: "var(--text-t)" },
          ].map((kpi) => (
            <div key={kpi.label} className="stat-card p-4">
              <div className="text-[10px] font-bold text-[var(--text-t)] uppercase tracking-wider">{kpi.label}</div>
              <div className="text-[28px] font-black font-mono leading-tight mt-1" style={{ color: kpi.color }}>{kpi.value}</div>
              {kpi.trend && <div className="text-[11px] font-semibold mt-1" style={{ color: kpi.trendColor }}>{kpi.trend}</div>}
            </div>
          ))}
        </section>

        {/* ═══ 3. 转化漏斗 ═══ */}
        {stats && stats.conversionFunnel.some((f) => f.count > 0) && (
          <section className="card p-5">
            <SectionHeading>转化漏斗</SectionHeading>
            <FunnelChart data={stats.conversionFunnel} />
          </section>
        )}

        {/* ═══ 4. 活动趋势 ═══ */}
        {stats && stats.dailyTrend.some((d) => d.applied > 0 || d.interview > 0) && (
          <section className="card p-5">
            <SectionHeading>近 30 天活动趋势</SectionHeading>
            <TrendChart data={stats.dailyTrend} />
          </section>
        )}

        {/* ═══ 5. 匹配度分布 ═══ */}
        <section className="card p-5">
          <SectionHeading>匹配度分布</SectionHeading>
          <div className="flex gap-6 items-center flex-col sm:flex-row">
            {/* Donut */}
            <div className="shrink-0">
              <svg viewBox="0 0 140 140" width="140" height="140">
                {(() => {
                  let offset = 0;
                  return donutData.map((seg, i) => {
                    if (seg.count === 0) return null;
                    const dash = (seg.count / total) * donutCirc;
                    const gap = donutCirc - dash;
                    const el = (
                      <circle
                        key={i} cx="70" cy="70" r={donutR}
                        fill="none" stroke={seg.color} strokeWidth="16"
                        strokeDasharray={`${dash} ${gap}`}
                        strokeDashoffset={-offset}
                        transform="rotate(-90 70 70)"
                      />
                    );
                    offset += dash;
                    return el;
                  });
                })()}
                <text x="70" y="66" textAnchor="middle" className="text-[22px] font-black font-mono" fill="var(--text)">{total}</text>
                <text x="70" y="82" textAnchor="middle" className="text-[10px]" fill="var(--text-t)">个岗位</text>
              </svg>
            </div>
            {/* Bucket cards */}
            <div className="flex-1 flex flex-col gap-2 w-full">
              {[
                { key: "high", label: "高匹配 >60%", count: high.length, color: "var(--primary, #5b4cff)", light: "rgba(91,76,255,.08)" },
                { key: "mid", label: "中匹配 30-60%", count: mid.length, color: "#a5b4fc", light: "rgba(91,76,255,.04)" },
                { key: "low", label: "低匹配 <30%", count: low.length, color: "rgba(0,0,0,.25)", light: "rgba(0,0,0,.03)" },
                { key: "none", label: "无关联", count: none.length, color: "rgba(0,0,0,.15)", light: "rgba(0,0,0,.02)" },
              ].map((b) => (
                <button
                  key={b.key}
                  onClick={() => setActiveBucket(activeBucket === b.key ? null : b.key)}
                  className={`flex items-center px-3 py-2.5 rounded-[var(--radius-xs)] transition text-left ${activeBucket === b.key ? "ring-2 ring-brand-500" : ""}`}
                  style={{ background: b.light }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: b.color }} />
                  <span className="flex-1 text-[12px] font-bold text-[var(--text)] ml-2.5">{b.label}</span>
                  <span className="text-lg font-black font-mono text-[var(--text)] mr-2">{b.count}</span>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full" style={{ background: b.light, color: b.color }}>
                    {total > 0 ? Math.round((b.count / total) * 100) : 0}%
                  </span>
                </button>
              ))}
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-[5px] rounded-full overflow-hidden flex bg-[rgba(0,0,0,0.04)] mt-4">
            {high.length > 0 && <div className="bg-brand-500 transition-all" style={{ flex: high.length }} />}
            {mid.length > 0 && <div className="bg-brand-200 transition-all" style={{ flex: mid.length }} />}
            {low.length > 0 && <div className="bg-[rgba(0,0,0,0.10)] transition-all" style={{ flex: low.length }} />}
            {none.length > 0 && <div className="bg-[rgba(0,0,0,0.04)] transition-all" style={{ flex: none.length }} />}
          </div>
          {/* Expanded list */}
          {activeBucket && (
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <div className="text-xs font-medium text-[var(--text)] mb-3">
                {activeBucket === "high" ? `高匹配岗位（${high.length}）` : activeBucket === "mid" ? `中匹配岗位（${mid.length}）` : activeBucket === "low" ? `低匹配岗位（${low.length}）` : `无关联岗位（${none.length}）`}
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {(activeBucket === "high" ? high : activeBucket === "mid" ? mid : activeBucket === "low" ? low : none)
                  .slice(0, 20)
                  .map((m) => (
                    <a key={m.job.id} href={`/job/${m.job.id}`} className="flex items-center gap-3 p-2.5 rounded-[var(--radius-xs)] hover:bg-[rgba(0,0,0,.02)] transition">
                      <span className={`shrink-0 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${m.score > 0.6 ? "bg-brand-500 text-white" : m.score > 0.3 ? "bg-brand-50 text-brand-500" : "bg-[rgba(0,0,0,0.04)] text-[var(--text-s)]"}`}>
                        {Math.round(m.score * 100)}%
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[var(--text)] truncate">{m.job.company} · {m.job.title}</div>
                        <div className="text-[11px] text-[var(--text-s)] mt-0.5 truncate">{m.reasons.slice(0, 2).join(" · ")}</div>
                      </div>
                      <span className="shrink-0 text-[11px] text-[var(--text-t)]">{m.job.location[0]}</span>
                    </a>
                  ))}
              </div>
            </div>
          )}
        </section>

        {/* ═══ 6. 技能图谱 ═══ */}
        <section className="card p-5">
          <SectionHeading>技能图谱</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <div className="text-xs font-extrabold text-[var(--green)] mb-2.5">已具备技能</div>
              {skillMatches.length === 0 ? (
                <p className="text-xs text-[var(--text-t)]">暂无匹配</p>
              ) : (
                <div className="space-y-1.5">
                  {skillMatches.map((s) => (
                    <div key={s.skill} className="flex items-center gap-2">
                      <span className="w-16 text-right text-[11px] text-[var(--text)] truncate shrink-0">{s.skill}</span>
                      <div className="flex-1 h-[5px] bg-[var(--green-light)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--green)] rounded-full" style={{ width: `${Math.min(100, (s.count / topMarketSkills[0].count) * 100)}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-[var(--text-t)] w-7 text-right">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs font-extrabold text-[var(--amber)] mb-2.5">市场热门缺口</div>
              {skillGaps.length === 0 ? (
                <p className="text-xs text-[var(--text-t)]">无明显缺口</p>
              ) : (
                <div className="space-y-1.5">
                  {skillGaps.slice(0, 8).map((s) => (
                    <div key={s.skill} className="flex items-center gap-2">
                      <span className="w-16 text-right text-[11px] text-[var(--text)] truncate shrink-0">{s.skill}</span>
                      <div className="flex-1 h-[5px] bg-[var(--amber-light)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--amber)] rounded-full" style={{ width: `${Math.min(100, (s.count / topMarketSkills[0].count) * 100)}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-[var(--text-t)] w-7 text-right">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ═══ 7. Top 推荐 ═══ */}
        <section className="card p-5">
          <SectionHeading>Top 10 推荐岗位</SectionHeading>
          {/* Top 3 featured */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {matches.slice(0, 3).map((m, i) => {
              const pct = Math.round(m.score * 100);
              const sr = 18;
              const sc = 2 * Math.PI * sr;
              const soff = sc * (1 - m.score);
              const scolor = pct > 75 ? "var(--primary)" : pct > 50 ? "var(--amber)" : "var(--text-t)";
              return (
                <a key={m.job.id} href={`/job/${m.job.id}`} className="relative p-4 rounded-[var(--radius-sm)] border border-[var(--border)] hover:border-[rgba(91,76,255,.2)] hover:shadow-[var(--shadow-md)] transition block">
                  <span className="absolute -top-px -left-px w-7 h-7 bg-brand-500 text-white text-[11px] font-black flex items-center justify-center rounded-br-[var(--radius-xs)]">
                    {i + 1}
                  </span>
                  <div className="flex justify-between items-start">
                    <div className="pl-5">
                      <div className="text-[13px] font-extrabold text-[var(--text)]">{m.job.company}</div>
                      <div className="text-[11px] text-brand-500 mt-0.5">{m.job.title}</div>
                    </div>
                    <svg viewBox="0 0 44 44" width="40" height="40" className="shrink-0">
                      <circle cx="22" cy="22" r={sr} fill="none" stroke="rgba(0,0,0,.06)" strokeWidth="4" />
                      <circle cx="22" cy="22" r={sr} fill="none" stroke={scolor} strokeWidth="4" strokeLinecap="round"
                        strokeDasharray={sc} strokeDashoffset={soff} transform="rotate(-90 22 22)" />
                      <text x="22" y="25" textAnchor="middle" style={{ fontSize: 11, fontWeight: 800, fontFamily: "var(--mono)", fill: scolor }}>{pct}%</text>
                    </svg>
                  </div>
                  <div className="text-[10px] text-[var(--text-s)] mt-2 line-clamp-2 leading-relaxed">{m.reasons.join(" · ")}</div>
                  <div className="text-[10px] text-[var(--text-t)] mt-1">📍 {m.job.location[0]}</div>
                </a>
              );
            })}
          </div>
          {/* 4-10 list */}
          <div className="border-t border-[var(--border)] pt-3">
            {matches.slice(3, 10).map((m, idx) => (
              <a key={m.job.id} href={`/job/${m.job.id}`}
                className={`flex items-center gap-2.5 py-2 px-3 rounded-[var(--radius-xs)] hover:bg-[rgba(0,0,0,.02)] transition ${idx < 6 ? "border-b border-[var(--border)]" : ""}`}
              >
                <span className="text-[11px] font-bold text-[var(--text-t)] w-5 text-center">{idx + 4}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-[var(--text)] truncate">{m.job.company} · {m.job.title}</div>
                  <div className="text-[10px] text-[var(--text-s)] mt-0.5 truncate">{m.reasons.slice(0, 2).join(" · ")}</div>
                </div>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-[var(--primary-light)] text-brand-500">
                  {Math.round(m.score * 100)}%
                </span>
                <span className="text-[11px] text-[var(--text-t)] shrink-0">{m.job.location[0]}</span>
              </a>
            ))}
          </div>
        </section>

        {/* ═══ 8. 行业分布 ═══ */}
        {Object.keys(industryDist).length > 0 && (
          <section className="card p-5">
            <SectionHeading>推荐投递行业</SectionHeading>
            <div className="space-y-1.5">
              {Object.entries(industryDist)
                .sort((a, b) => b[1] - a[1])
                .map(([ind, count]) => {
                  const max = Object.values(industryDist).reduce((a, b) => Math.max(a, b), 1);
                  const color = INDUSTRY_COLORS[ind] ?? INDUSTRY_COLORS["其他"];
                  return (
                    <div key={ind} className="flex items-center gap-2">
                      <span className="w-12 text-right text-[11px] font-semibold text-[var(--text-s)] shrink-0">{ind}</span>
                      <div className="flex-1 h-[18px] bg-[rgba(0,0,0,.03)] rounded-[3px] overflow-hidden">
                        <div className="h-full rounded-[3px] transition-all" style={{ width: `${(count / max) * 100}%`, background: color, opacity: 0.85 }} />
                      </div>
                      <span className="w-6 text-right text-[12px] font-extrabold font-mono text-[var(--text)]">{count}</span>
                    </div>
                  );
                })}
            </div>
            <div className="text-[11px] text-[var(--text-t)] text-right mt-2">
              基于 {Object.values(industryDist).reduce((a, b) => a + b, 0)} 个高匹配岗位
            </div>
          </section>
        )}

        {/* ═══ 9. 面试洞察 ═══ */}
        {loggedIn && (
          <section className="card p-5">
            <SectionHeading barColor="var(--cyan, #1ABCFE)">面试洞察</SectionHeading>
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
              {[
                { label: "总轮次", value: String(allRounds.length), color: "var(--primary)", bg: "var(--primary-light)" },
                { label: "通过率", value: `${ivPassRate}%`, color: "var(--green)", bg: "var(--green-light)" },
                { label: "Offer 转化", value: `${ivOfferRate}%`, color: "var(--amber)", bg: "var(--amber-light)" },
                { label: "平均面感", value: avgFeeling, color: "var(--cyan)", bg: "var(--cyan-light)" },
              ].map((kpi) => (
                <div key={kpi.label} className="text-center p-3 rounded-[var(--radius-xs)]" style={{ background: kpi.bg }}>
                  <div className="text-xl font-black font-mono" style={{ color: kpi.color }}>{kpi.value}</div>
                  <div className="text-[10px] text-[var(--text-s)] mt-0.5">{kpi.label}</div>
                </div>
              ))}
            </div>
            {/* Heatmap */}
            {stats && Object.keys(stats.interviewHeatmap).length > 0 && (
              <div className="mb-4">
                <div className="text-[11px] font-bold text-[var(--text-s)] mb-2">面试活动热力图</div>
                <InterviewCalendar heatmap={stats.interviewHeatmap} />
              </div>
            )}
            {/* Question types */}
            <div className="mb-4">
              <div className="text-[11px] font-bold text-[var(--text-s)] mb-2">高频面试题型</div>
              <div className="flex flex-wrap gap-1.5">
                {questionTypes.map((t) => (
                  <span key={t} className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[var(--primary-light)] text-brand-500">{t}</span>
                ))}
              </div>
            </div>
            {/* Best / worst */}
            {(bestRound || worstRound) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {bestRound && bestIv && (
                  <div className="p-2.5 rounded-[var(--radius-xs)] border-l-[3px] border-[var(--green)] bg-[var(--green-light)]">
                    <div className="text-[11px] font-bold text-[var(--green)]">最佳表现</div>
                    <div className="text-[12px] font-semibold text-[var(--text)] mt-1">{bestIv.company} · {bestRound.round}</div>
                    <div className="text-[10px] text-[var(--text-s)] mt-0.5">{bestRound.result} · 面感: {bestRound.feeling}{bestRound.feedback ? ` · "${bestRound.feedback}"` : ""}</div>
                  </div>
                )}
                {worstRound && worstIv && (
                  <div className="p-2.5 rounded-[var(--radius-xs)] border-l-[3px] border-[var(--amber)] bg-[var(--amber-light)]">
                    <div className="text-[11px] font-bold text-[var(--amber)]">需改进</div>
                    <div className="text-[12px] font-semibold text-[var(--text)] mt-1">{worstIv.company} · {worstRound.round}</div>
                    <div className="text-[10px] text-[var(--text-s)] mt-0.5">{worstRound.result || "待定"} · 面感: {worstRound.feeling}{worstRound.feedback ? ` · "${worstRound.feedback}"` : ""}</div>
                  </div>
                )}
              </div>
            )}
            {allRounds.length === 0 && (
              <div className="text-center py-6 text-sm text-[var(--text-t)]">暂无面试记录，在「投递 & 面试」页面添加面试信息后即可看到洞察</div>
            )}
          </section>
        )}

        {/* ═══ 10. 紧急行动项 ═══ */}
        {urgentTop.length > 0 && (
          <section className="card p-5 border-t-[3px] border-[var(--rose)]">
            <SectionHeading barColor="var(--rose, #F43F5E)">紧急行动项</SectionHeading>
            <p className="text-[11px] text-[var(--text-s)] mb-3">以下高匹配岗位即将截止，建议尽快投递：</p>
            <div className="space-y-2">
              {urgentTop.map((m) => {
                const d = m.daysLeft ?? 99;
                let badgeCls = "bg-[var(--green-light)] text-[var(--green)]";
                if (d <= 3) badgeCls = "bg-[var(--rose)] text-white";
                else if (d <= 7) badgeCls = "bg-[var(--amber)] text-white";
                return (
                  <a key={m.job.id} href={`/job/${m.job.id}`} className="flex items-center gap-3 p-3 rounded-[var(--radius-xs)] border border-[var(--border)] hover:border-[rgba(91,76,255,.2)] transition">
                    <span className={`shrink-0 text-[10px] font-bold font-mono px-2 py-1 rounded-full ${badgeCls}`}>{d}天</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[var(--text)]">{m.job.company} · {m.job.title}</div>
                      <div className="text-[10px] text-[var(--text-t)] mt-0.5">截止 {m.job.deadline?.slice(0, 10)}</div>
                    </div>
                    <span className="text-[10px] font-bold font-mono text-brand-500">{Math.round(m.score * 100)}%</span>
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {/* ═══ 11. 简历优化 ═══ */}
        <section className="card p-5">
          <SectionHeading>简历优化建议</SectionHeading>
          <div className="space-y-2.5">
            {skillGaps.length > 0 && (
              <div className="relative p-3 rounded-[var(--radius-xs)] border border-[var(--rose-light)]">
                <span className="absolute top-2.5 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--rose-light)] text-[var(--rose)]">高优</span>
                <div className="text-[12px] font-bold text-[var(--text)] mb-1 pr-14">补充热门技能关键词</div>
                <div className="text-[11px] text-[var(--text-s)] leading-relaxed">
                  简历中缺少以下市场高需求技能：<strong>{skillGaps.slice(0, 5).map((s) => s.skill).join("、")}</strong>。如有相关经验，建议明确提及。
                </div>
              </div>
            )}
            {(prefs.targetRoles ?? []).length > 0 && (
              <div className="relative p-3 rounded-[var(--radius-xs)] border border-[var(--rose-light)]">
                <span className="absolute top-2.5 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--rose-light)] text-[var(--rose)]">高优</span>
                <div className="text-[12px] font-bold text-[var(--text)] mb-1 pr-14">突出目标岗位关键词</div>
                <div className="text-[11px] text-[var(--text-s)] leading-relaxed">
                  目标岗位为 <strong>{(prefs.targetRoles ?? []).join("、")}</strong>，建议简历标题和经历中直接出现这些关键词。
                </div>
              </div>
            )}
            {high.length > 0 && (
              <div className="relative p-3 rounded-[var(--radius-xs)] border border-[var(--amber-light)]">
                <span className="absolute top-2.5 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--amber-light)] text-[var(--amber)]">中优</span>
                <div className="text-[12px] font-bold text-[var(--text)] mb-1 pr-14">针对性定制简历</div>
                <div className="text-[11px] text-[var(--text-s)] leading-relaxed">
                  {high.length} 个高匹配岗位中，Top 3 为 {high.slice(0, 3).map((m) => m.job.company).join("、")}，建议分别准备定制版简历。
                </div>
              </div>
            )}
            <div className="relative p-3 rounded-[var(--radius-xs)] border border-[var(--border)]">
              <span className="absolute top-2.5 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[rgba(0,0,0,.04)] text-[var(--text-t)]">建议</span>
              <div className="text-[12px] font-bold text-[var(--text)] mb-1 pr-14">STAR 法则结构化</div>
              <div className="text-[11px] text-[var(--text-s)] leading-relaxed">
                每段实习经历用 Situation → Task → Action → Result 描述，量化成果（提升 XX%、覆盖 XX 用户）。
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 12. 本周计划 ═══ */}
        {weeklyJobs.length > 0 && (
          <section className="card p-5">
            <SectionHeading barColor="var(--cyan, #1ABCFE)">本周推荐投递</SectionHeading>
            <p className="text-[11px] text-[var(--text-s)] mb-3">基于匹配度和截止日期智能推荐</p>
            <div className="space-y-2.5 mb-4">
              {weeklyJobs.map((m, i) => {
                const d = m.daysLeft;
                const urgLabel = d !== null && d >= 0 && d <= 3 ? "紧急" : d !== null && d >= 0 && d <= 7 ? "本周" : "下周";
                const urgColor = urgLabel === "紧急" ? "var(--rose)" : urgLabel === "本周" ? "var(--amber)" : "var(--cyan)";
                const urgBg = urgLabel === "紧急" ? "var(--rose-light)" : urgLabel === "本周" ? "var(--amber-light)" : "var(--cyan-light)";
                return (
                  <a key={m.job.id} href={`/job/${m.job.id}`} className="flex items-center gap-3 p-3 rounded-[var(--radius-xs)] border border-[var(--border)] hover:border-[rgba(91,76,255,.2)] transition">
                    <span className="w-6 h-6 bg-brand-500 text-white text-[11px] font-extrabold rounded-full flex items-center justify-center shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-[var(--text)]">{m.job.company}</div>
                      <div className="text-[11px] text-brand-500 mt-0.5">{m.job.title}</div>
                    </div>
                    {d !== null && d >= 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: urgBg, color: urgColor }}>
                        {d}天 · {urgLabel}
                      </span>
                    )}
                    <span className="text-[11px] font-bold font-mono text-brand-500">{Math.round(m.score * 100)}%</span>
                  </a>
                );
              })}
            </div>
            {/* Week plan */}
            <div className="border-t border-[var(--border)] pt-3">
              <div className="text-[12px] font-extrabold text-[var(--text)] mb-2.5">周计划安排</div>
              <div className="space-y-1.5">
                {[
                  { day: "周一", action: weeklyJobs[0] ? `投递 ${weeklyJobs[0].job.company} ${weeklyJobs[0].job.title}` : "浏览新增岗位", color: "var(--rose)" },
                  { day: "周二", action: "准备面试 — 复习高频题型 + 公司业务调研", color: "var(--primary)" },
                  { day: "周三", action: weeklyJobs[1] ? `投递 ${weeklyJobs[1].job.company} + 定制简历` : "优化简历关键词", color: "var(--primary)" },
                  { day: "周四", action: "复盘本周面试反馈，优化回答框架", color: "var(--amber)" },
                  { day: "周五", action: weeklyJobs[2] ? `投递 ${weeklyJobs[2].job.company} + 浏览新增岗位` : "浏览新增高匹配岗位", color: "var(--cyan)" },
                  { day: "周末", action: `补充 ${skillGaps[0]?.skill ?? "技能"} 学习 + 更新画像`, color: "var(--green)" },
                ].map((p) => (
                  <div key={p.day} className="flex items-center gap-2.5 py-1">
                    <span className="w-9 text-[12px] font-extrabold shrink-0" style={{ color: p.color }}>{p.day}</span>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 opacity-60" style={{ background: p.color }} />
                    <span className="text-[12px] text-[var(--text-s)]">{p.action}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═══ 13. 面试题预测 ═══ */}
        <section className="card p-5">
          <SectionHeading>面试题预测</SectionHeading>
          <p className="text-[11px] text-[var(--text-s)] mb-3">基于你的目标岗位和技能，可能会被问到的面试题：</p>
          <div className="space-y-2">
            {generateInterviewQuestions(prefs, matches.slice(0, 5).map((m) => m.job)).map((q, i) => (
              <div key={i} className="p-3 rounded-[var(--radius-xs)] border border-[var(--border)] hover:border-brand-200 transition">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-brand-50 text-brand-500 text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <div>
                    <div className="text-sm text-[var(--text)]">{q.question}</div>
                    <div className="text-[11px] text-[var(--text-t)] mt-1">{q.category} · {q.source}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] mt-4 print:hidden">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-6 text-center">
          <div className="flex justify-center gap-3 mb-3">
            <button
              onClick={() => navigator.clipboard.writeText(window.location.href).then(() => alert("链接已复制"))}
              className="px-4 py-1.5 rounded-[var(--radius-xs)] text-[12px] font-semibold text-[var(--text-s)] border border-[var(--border)] bg-[var(--surface-solid)] hover:border-brand-500 transition"
            >
              分享链接
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-1.5 rounded-[var(--radius-xs)] text-[12px] font-semibold text-white bg-brand-500 transition"
            >
              导出 PDF
            </button>
          </div>
          <div className="text-[10px] text-[var(--text-t)]">数据基于本地画像与公开岗位信息匹配，仅供参考</div>
          <div className="text-[11px] text-[var(--text-t)] mt-1">
            Made with ♥ by <a href="https://github.com/Jackychen-12" target="_blank" rel="noreferrer" className="hover:text-[var(--text-s)] transition">Jacky</a> · Career Search
          </div>
        </div>
      </footer>
    </div>
  );
}

function generateInterviewQuestions(prefs: Prefs, topJobs: Job[]): { question: string; category: string; source: string }[] {
  const questions: { question: string; category: string; source: string }[] = [];
  const roles = prefs.targetRoles ?? [];
  const skills = prefs.skills ?? [];

  if (roles.some((r) => /产品/.test(r))) {
    questions.push(
      { question: "请设计一个功能来提升某产品的用户留存率", category: "产品设计", source: "产品经理高频题" },
      { question: "如何从 0 到 1 规划一个新产品？请描述你的方法论", category: "产品思维", source: "产品经理高频题" },
      { question: "给你一个数据下降的场景，你如何分析原因？", category: "数据分析", source: "产品经理高频题" },
    );
  }
  if (roles.some((r) => /管培/.test(r))) {
    questions.push(
      { question: "你为什么选择管培生而不是直接应聘某个岗位？", category: "动机", source: "管培生常见题" },
      { question: "描述一次你在团队中解决冲突的经历", category: "领导力", source: "管培生常见题" },
      { question: "如果让你在三个月内熟悉一个全新的业务线，你会怎么做？", category: "学习能力", source: "管培生常见题" },
    );
  }
  if (roles.some((r) => /数据|分析/.test(r))) {
    questions.push(
      { question: "SQL 中 LEFT JOIN 和 INNER JOIN 的区别？写一个多表关联查询", category: "技术", source: "数据分析高频题" },
      { question: "描述一次你用数据驱动决策的经历，结果如何？", category: "业务", source: "数据分析高频题" },
    );
  }
  if (skills.some((s) => /AI|人工智能|大模型|LLM/.test(s))) {
    questions.push(
      { question: "你如何理解大模型在实际产品中的应用场景和局限性？", category: "AI 认知", source: "AI 岗位高频题" },
      { question: "Prompt Engineering 的核心原则有哪些？", category: "技术", source: "AI 岗位高频题" },
    );
  }
  if (roles.some((r) => /金融|投行/.test(r)) || prefs.categories.includes("金融")) {
    questions.push(
      { question: "请简单解释 DCF 估值模型的基本步骤", category: "金融基础", source: "金融岗高频题" },
      { question: "如何看待当前中国资本市场的发展趋势？", category: "行业认知", source: "金融岗高频题" },
    );
  }

  questions.push(
    { question: "请做一分钟自我介绍", category: "基础", source: "通用高频题" },
    { question: "你的职业规划是什么？3-5 年后你希望在做什么？", category: "规划", source: "通用高频题" },
  );

  if (topJobs.length > 0) {
    questions.push({
      question: `你为什么想加入 ${topJobs[0].company}？对我们的业务有什么了解？`,
      category: "公司认知",
      source: `${topJobs[0].company} 针对性`,
    });
  }

  return questions.slice(0, 10);
}
