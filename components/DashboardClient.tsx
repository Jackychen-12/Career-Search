"use client";

import { useState, useEffect } from "react";
import { loadTracking, type TrackingData } from "@/lib/tracker";
import { loadInterviews, type InterviewRecord } from "@/lib/interviews";
import { computeDashboardStats, type DashboardStats } from "@/lib/dashboardStats";
import { FunnelChart } from "./charts/FunnelChart";
import { TrendChart } from "./charts/TrendChart";
import { StatusPie } from "./charts/StatusPie";
import { InterviewCalendar } from "./charts/InterviewCalendar";

interface Props {
  tracking: TrackingData;
  interviews: InterviewRecord[];
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="stat-card p-4 flex flex-col gap-1">
      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon: string }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
      <span className="text-base">{icon}</span>
      {children}
    </h3>
  );
}

export function DashboardClient({ tracking, interviews }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    setStats(computeDashboardStats(tracking, interviews));
  }, [tracking, interviews]);

  if (!stats) return null;

  const { total, byStatus, conversionFunnel, dailyTrend, weeklyActivity, offerRate, avgRoundsToOffer, interviewHeatmap } = stats;

  return (
    <div className="space-y-5">
      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="总投递" value={total} color="text-slate-900 dark:text-white" />
        <StatCard
          label="面试中"
          value={byStatus.interview + byStatus.hr}
          sub={`笔试 ${byStatus.written}`}
          color="text-amber-600 dark:text-amber-400"
        />
        <StatCard label="已拿 Offer" value={byStatus.offer} color="text-green-600 dark:text-green-400" />
        <StatCard
          label="Offer 率"
          value={`${offerRate}%`}
          sub={avgRoundsToOffer > 0 ? `平均 ${avgRoundsToOffer} 轮` : undefined}
          color="text-brand-600 dark:text-brand-400"
        />
        <StatCard label="本周活跃" value={weeklyActivity} color="text-cyan-600 dark:text-cyan-400" />
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <SectionTitle icon="📊">投递转化漏斗</SectionTitle>
          <FunnelChart data={conversionFunnel} />
        </div>
        <div className="card p-5">
          <SectionTitle icon="📈">近 30 天趋势</SectionTitle>
          <TrendChart data={dailyTrend} />
        </div>
      </div>

      {/* ── Charts Row 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <SectionTitle icon="🎯">状态分布</SectionTitle>
          <StatusPie byStatus={byStatus} />
        </div>
        <div className="card p-5">
          <SectionTitle icon="🗓️">面试热力图</SectionTitle>
          <InterviewCalendar heatmap={interviewHeatmap} />
        </div>
      </div>
    </div>
  );
}
