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
    <article className="card p-4 flex flex-col gap-2.5 group">
      {/* Header row: company + salary + actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900 truncate">{job.company}</span>
            {isNew && (
              <span className="shrink-0 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 tracking-wide">
                NEW
              </span>
            )}
          </div>
          <div className="text-[13px] text-cyan-700 mt-1 line-clamp-2 leading-snug font-medium">
            {job.title}
          </div>
        </div>
        {onTrack && (
          <button
            onClick={() => onTrack(job.id, trackingStatus ? null : "saved")}
            className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition ${
              trackingStatus ? "text-red-500 bg-red-50" : "text-slate-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100"
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill={trackingStatus ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        )}
      </div>

      {/* Description */}
      {job.description && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
          {job.description}
        </p>
      )}

      {/* Meta: location, type, deadline, salary, requirements */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 font-mono">
        <span>{job.location.join(" / ")}</span>
        <span className="text-slate-300">|</span>
        <span>{job.jobType}</span>
        {job.salary && <span className="text-cyan-600 font-medium">{job.salary}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
        {job.deadline ? (
          <span className={urgent ? "text-red-500 font-medium font-mono" : "font-mono"}>
            截止 {job.deadline.slice(0, 10)}{dl !== null && dl >= 0 ? ` (剩${dl}天)` : dl !== null && dl < 0 ? " (已过期)" : ""}
          </span>
        ) : (
          <span className="text-emerald-500">滚动招聘 · 无截止</span>
        )}
        {job.requirements && <span className="text-slate-400">· {job.requirements}</span>}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2.5 mt-auto border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${CATEGORY_COLORS[job.category]}`}>
            {job.category}
          </span>
          {trackingStatus && (
            <select
              value={trackingStatus}
              onChange={(e) => onTrack?.(job.id, e.target.value as TrackingStatus)}
              className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-600"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
          {job.tags.slice(0, 1).map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-400 border border-slate-100">
              {t}
            </span>
          ))}
        </div>
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-[11px] font-medium text-white px-3 py-1.5 rounded-md bg-nav hover:bg-slate-800 transition"
        >
          投递 →
        </a>
      </div>
    </article>
  );
}
