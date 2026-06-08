import { daysUntil } from "@/lib/scoring";
import type { Job } from "@/lib/types";

export default function StatBar({ jobs, now, newCount }: { jobs: Job[]; now: number; newCount: number }) {
  const d = new Date(now);
  const stats = [
    { label: "总岗位", value: jobs.length },
    { label: "今日新增", value: newCount, color: newCount > 0 ? "text-emerald-600" : undefined },
    { label: "暑期实习", value: jobs.filter((j) => j.jobType === "暑期实习").length },
    { label: "秋招", value: jobs.filter((j) => j.jobType === "秋招" || j.jobType === "校招").length },
    { label: "海外", value: jobs.filter((j) => j.category === "外企" || j.region !== "大陆").length },
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
    <div className="flex flex-wrap gap-4 sm:gap-6 py-3">
      {stats.map((s) => (
        <div key={s.label} className="flex items-baseline gap-1.5">
          <span className={`text-xl font-bold font-mono ${s.color ?? "text-gray-900"}`}>
            {s.value}
          </span>
          <span className="text-xs text-gray-400">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
