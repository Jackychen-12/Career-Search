import { TrackingData, TrackingStatus } from "./tracker";
import { InterviewRecord } from "./interviews";

export interface DashboardStats {
  total: number;
  byStatus: Record<TrackingStatus, number>;
  conversionFunnel: { stage: string; count: number; rate: number }[];
  dailyTrend: { date: string; applied: number; interview: number }[];
  weeklyActivity: number;
  offerRate: number;
  avgRoundsToOffer: number;
  interviewHeatmap: Record<string, number>;
}

const STATUS_LABELS: Record<string, string> = {
  saved: "收藏",
  applied: "已投递",
  written: "笔试",
  interview: "面试",
  hr: "HR面",
  offer: "Offer",
};

const FUNNEL_ORDER: TrackingStatus[] = ["saved", "applied", "written", "interview", "hr", "offer"];

export function computeDashboardStats(
  tracking: TrackingData,
  interviews: InterviewRecord[]
): DashboardStats {
  const entries = Object.values(tracking);
  const total = entries.length;

  const byStatus: Record<TrackingStatus, number> = {
    saved: 0, applied: 0, written: 0, interview: 0, hr: 0, offer: 0, rejected: 0, withdrawn: 0,
  };
  for (const e of entries) byStatus[e.status]++;

  const funnelCounts: Record<string, number> = {};
  for (const stage of FUNNEL_ORDER) {
    funnelCounts[stage] = entries.filter((e) => {
      const idx = FUNNEL_ORDER.indexOf(e.status);
      const stageIdx = FUNNEL_ORDER.indexOf(stage);
      return idx >= stageIdx || e.status === "rejected" || e.status === "withdrawn"
        ? stageIdx <= Math.max(idx, FUNNEL_ORDER.indexOf("applied"))
        : false;
    }).length;
  }
  funnelCounts["saved"] = total;
  funnelCounts["applied"] = entries.filter(
    (e) => e.status !== "saved"
  ).length;
  funnelCounts["written"] = entries.filter(
    (e) => ["written", "interview", "hr", "offer"].includes(e.status)
  ).length;
  funnelCounts["interview"] = entries.filter(
    (e) => ["interview", "hr", "offer"].includes(e.status)
  ).length;
  funnelCounts["hr"] = entries.filter(
    (e) => ["hr", "offer"].includes(e.status)
  ).length;
  funnelCounts["offer"] = byStatus.offer;

  const conversionFunnel = FUNNEL_ORDER.map((stage, i) => ({
    stage: STATUS_LABELS[stage],
    count: funnelCounts[stage],
    rate: i === 0 ? 100 : funnelCounts[FUNNEL_ORDER[0]] > 0
      ? Math.round((funnelCounts[stage] / funnelCounts[FUNNEL_ORDER[0]]) * 100)
      : 0,
  }));

  const now = new Date();
  const days30: { date: string; applied: number; interview: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const applied = entries.filter((e) => e.appliedAt?.slice(0, 10) === key).length;
    const interview = entries.filter((e) => e.interviewAt?.slice(0, 10) === key).length
      + interviews.filter((r) => r.rounds.some((rd) => rd.date?.slice(0, 10) === key)).length;
    days30.push({ date: key, applied, interview });
  }

  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekKey = weekAgo.toISOString().slice(0, 10);
  const weeklyActivity = entries.filter((e) => e.updatedAt >= weekKey).length;

  const totalApplied = entries.filter((e) => e.status !== "saved").length;
  const offerRate = totalApplied > 0 ? Math.round((byStatus.offer / totalApplied) * 100) : 0;

  const offersWithRounds = interviews.filter((r) => r.status === "已拿offer" && r.rounds.length > 0);
  const avgRoundsToOffer = offersWithRounds.length > 0
    ? Math.round((offersWithRounds.reduce((sum, r) => sum + r.rounds.length, 0) / offersWithRounds.length) * 10) / 10
    : 0;

  const interviewHeatmap: Record<string, number> = {};
  for (const record of interviews) {
    for (const round of record.rounds) {
      if (round.date) {
        const key = round.date.slice(0, 10);
        interviewHeatmap[key] = (interviewHeatmap[key] || 0) + 1;
      }
    }
  }
  for (const e of entries) {
    if (e.interviewAt) {
      const key = e.interviewAt.slice(0, 10);
      if (!interviewHeatmap[key]) interviewHeatmap[key] = 1;
    }
    if (e.appliedAt) {
      const key = e.appliedAt.slice(0, 10);
      interviewHeatmap[key] = (interviewHeatmap[key] || 0) + 1;
    }
  }

  return {
    total,
    byStatus,
    conversionFunnel,
    dailyTrend: days30,
    weeklyActivity,
    offerRate,
    avgRoundsToOffer,
    interviewHeatmap,
  };
}
