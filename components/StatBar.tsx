import { daysUntil } from "@/lib/scoring";
import type { Job } from "@/lib/types";

const STAT_CONFIG = [
  {
    key: "total",
    label: "活跃岗位",
    borderColor: "border-l-indigo-500",
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-500",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a4 4 0 0 0-8 0v2" />
      </svg>
    ),
  },
  {
    key: "new",
    label: "今日新增",
    borderColor: "border-l-green-500",
    iconBg: "bg-green-50",
    iconColor: "text-green-500",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    key: "campus",
    label: "秋招/校招",
    borderColor: "border-l-violet-400",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-400",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5" />
      </svg>
    ),
  },
  {
    key: "overseas",
    label: "海外/外企",
    borderColor: "border-l-indigo-500",
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-500",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    key: "urgent",
    label: "临近截止",
    borderColor: "border-l-amber-500",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

export default function StatBar({ jobs, now, newCount }: { jobs: Job[]; now: number; newCount: number }) {
  const d = new Date(now);
  const urgentCount = jobs.filter((j) => {
    const x = daysUntil(j.deadline, d);
    return x !== null && x >= 0 && x <= 15;
  }).length;

  const values: Record<string, number> = {
    total: jobs.length,
    new: newCount,
    campus: jobs.filter((j) => j.jobType === "秋招" || j.jobType === "校招").length,
    overseas: jobs.filter((j) => j.category === "外企" || j.region !== "大陆").length,
    urgent: urgentCount,
  };

  const valueColors: Record<string, string> = {
    new: newCount > 0 ? "text-green-600" : "text-gray-900",
    urgent: urgentCount > 0 ? "text-red-600" : "text-gray-900",
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {STAT_CONFIG.map((s) => (
        <div key={s.key} className={`stat-card px-4 py-3 flex items-center gap-3 border-l-[3px] ${s.borderColor}`}>
          <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center ${s.iconColor}`}>
            {s.icon}
          </div>
          <div>
            <div className={`text-xl font-bold ${valueColors[s.key] ?? "text-gray-900"}`}>
              {values[s.key].toLocaleString()}
            </div>
            <div className="text-[11px] text-gray-500">{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
