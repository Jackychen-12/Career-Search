import { daysUntil } from "@/lib/scoring";
import type { Job } from "@/lib/types";

export default function StatBar({ jobs, now, newCount }: { jobs: Job[]; now: number; newCount: number }) {
  const d = new Date(now);
  const urgentCount = jobs.filter((j) => {
    const x = daysUntil(j.deadline, d);
    return x !== null && x >= 0 && x <= 15;
  }).length;
  const stats = [
    { label: "总岗位", value: jobs.length, color: "text-gray-900" },
    { label: "今日新增", value: newCount, color: newCount > 0 ? "text-green-600" : "text-gray-900" },
    { label: "秋招/校招", value: jobs.filter((j) => j.jobType === "秋招" || j.jobType === "校招").length, color: "text-gray-900" },
    { label: "海外/外企", value: jobs.filter((j) => j.category === "外企" || j.region !== "大陆").length, color: "text-gray-900" },
    { label: "临近截止", value: urgentCount, color: urgentCount > 0 ? "text-red-600" : "text-gray-900" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="stat-card px-4 py-3 text-center">
          <div className={`text-xl font-bold ${s.color}`}>{s.value.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
