"use client";

import type { Job } from "@/lib/types";
import type { TrackingData, TrackingStatus } from "@/lib/tracker";

const STATUS_LABELS: Record<TrackingStatus, { label: string; color: string }> = {
  saved: { label: "已收藏", color: "bg-gray-100 text-gray-700" },
  applied: { label: "已投递", color: "bg-blue-50 text-blue-700" },
  interview: { label: "面试中", color: "bg-amber-50 text-amber-700" },
  offer: { label: "已拿 Offer", color: "bg-brand-50 text-brand-700" },
  rejected: { label: "已拒绝", color: "bg-red-50 text-red-600" },
};

export default function TrackingPanel({
  open,
  onClose,
  tracking,
  jobs,
}: {
  open: boolean;
  onClose: () => void;
  tracking: TrackingData;
  jobs: Job[];
}) {
  if (!open) return null;

  const trackedJobs = Object.entries(tracking)
    .map(([id, entry]) => ({ job: jobs.find((j) => j.id === id), entry }))
    .filter((x): x is { job: Job; entry: typeof x.entry } => !!x.job)
    .sort((a, b) => b.entry.updatedAt.localeCompare(a.entry.updatedAt));

  const grouped = {
    interview: trackedJobs.filter((t) => t.entry.status === "interview"),
    applied: trackedJobs.filter((t) => t.entry.status === "applied"),
    saved: trackedJobs.filter((t) => t.entry.status === "saved"),
    offer: trackedJobs.filter((t) => t.entry.status === "offer"),
    rejected: trackedJobs.filter((t) => t.entry.status === "rejected"),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">我的投递追踪</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">
            ×
          </button>
        </div>

        {trackedJobs.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">
            还没有追踪任何岗位。点击岗位卡片上的心形按钮来收藏。
          </p>
        ) : (
          <div className="space-y-4">
            {(Object.entries(grouped) as [TrackingStatus, typeof trackedJobs][]).map(([status, items]) => {
              if (items.length === 0) return null;
              const { label, color } = STATUS_LABELS[status];
              return (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${color}`}>{label}</span>
                    <span className="text-xs text-gray-400">{items.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {items.map(({ job }) => (
                      <a
                        key={job.id}
                        href={job.applyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block p-3 rounded-lg border border-gray-100 hover:border-brand-300 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{job.company}</span>
                          <span className="text-xs text-gray-400">{job.location[0]}</span>
                        </div>
                        <div className="text-xs text-brand-600 mt-0.5 truncate">{job.title}</div>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
