"use client";

import { CATEGORY_COLORS } from "@/lib/taxonomy";
import { daysUntil } from "@/lib/scoring";
import type { Job } from "@/lib/types";
import type { TrackingStatus } from "@/lib/tracker";

function md(iso: string | null): string {
  return iso ? iso.slice(5, 10) : "";
}

const STATUS_OPTIONS: { value: TrackingStatus; label: string }[] = [
  { value: "saved", label: "收藏" },
  { value: "applied", label: "已投" },
  { value: "interview", label: "面试" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "拒绝" },
];

export default function JobCard({
  job,
  now,
  isNew,
  trackingStatus,
  onTrack,
}: {
  job: Job;
  now: number;
  isNew?: boolean;
  trackingStatus?: TrackingStatus | null;
  onTrack?: (jobId: string, status: TrackingStatus | null) => void;
}) {
  const dl = daysUntil(job.deadline, new Date(now));
  const urgent = dl !== null && dl >= 0 && dl <= 15;

  return (
    <article className="card p-4 flex flex-col gap-2.5 relative group">
      {isNew && (
        <span className="absolute top-3 right-3 text-[9px] font-bold font-mono tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
          NEW
        </span>
      )}

      {/* Company + Title */}
      <div className="pr-10">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900 truncate">{job.company}</span>
          {job.salary && (
            <span className="text-[10px] font-mono font-medium text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded shrink-0">
              {job.salary}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">{job.title}</div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
        <span>{job.location.join(" / ")}</span>
        <span>{job.jobType}</span>
        {job.deadline ? (
          <span className={urgent ? "text-red-500 font-medium" : ""}>
            {md(job.deadline)}{dl !== null && dl >= 0 ? ` · ${dl}天` : ""}
          </span>
        ) : (
          <span className="text-emerald-500">长期</span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 mt-auto border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${CATEGORY_COLORS[job.category]}`}>
            {job.category}
          </span>
          {trackingStatus && (
            <select
              value={trackingStatus}
              onChange={(e) => onTrack?.(job.id, e.target.value as TrackingStatus)}
              className="text-[10px] px-1 py-0.5 rounded border border-gray-200 bg-white text-gray-600"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
          {job.tags.slice(0, 1).map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-400">
              {t}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {onTrack && (
            <button
              onClick={() => onTrack(job.id, trackingStatus ? null : "saved")}
              className={`w-6 h-6 rounded-md flex items-center justify-center transition ${
                trackingStatus ? "text-red-500 bg-red-50" : "text-gray-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill={trackingStatus ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          )}
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-medium text-gray-900 px-2.5 py-1.5 rounded-md border border-gray-200 hover:border-gray-900 hover:bg-gray-900 hover:text-white transition"
          >
            投递
          </a>
        </div>
      </div>
    </article>
  );
}
