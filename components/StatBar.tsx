import { daysUntil } from "@/lib/scoring";
import type { Job } from "@/lib/types";

export default function StatBar({ jobs, now, newCount }: { jobs: Job[]; now: number; newCount: number }) {
  const d = new Date(now);
  const stats = [
    { label: "总岗位", value: jobs.length, color: "text-slate-900" },
    { label: "今日新增", value: newCount, color: newCount > 0 ? "text-emerald-600" : "text-slate-900" },
    { label: "暑期实习", value: jobs.filter((j) => j.jobType === "暑期实习").length, color: "text-slate-900" },
    { label: "秋招/校招", value: jobs.filter((j) => j.jobType === "秋招" || j.jobType === "校招").length, color: "text-slate-900" },
    { label: "外企/海外", value: jobs.filter((j) => j.category === "外企" || j.region !== "大陆").length, color: "text-slate-900" },
    {
      label: "临近截止",
      value: jobs.filter((j) => {
        const x = daysUntil(j.deadline, d);
        return x !== null && x >= 0 && x <= 15;
      }).length,
      color: "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {stats.map((s) => (
        <div key={s.label} className="stat-card px-3 py-3 text-center">
          <div className={`text-lg font-bold font-mono ${s.color}`}>
            {s.value.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
