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
    <article className="card p-5 flex flex-col gap-3 relative">
      {isNew && (
        <span className="absolute -top-2 -right-2 text-[10px] font-bold text-white px-1.5 py-0.5 rounded-md bg-emerald-500 shadow-sm">
          NEW
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-bold leading-tight truncate">{job.company}</div>
          <div className="text-brand-600 font-medium text-sm mt-1 line-clamp-2">{job.title}</div>
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {job.salary && (
            <span className="text-xs font-bold text-white px-2.5 py-1 rounded-full bg-gradient-to-r from-brand-500 to-brand-700">
              {job.salary}
            </span>
          )}
          {onTrack && (
            <button
              onClick={() => onTrack(job.id, trackingStatus ? null : "saved")}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                trackingStatus ? "text-red-500 bg-red-50" : "text-gray-300 hover:text-red-400 hover:bg-red-50"
              }`}
              title={trackingStatus ? "取消收藏" : "收藏"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={trackingStatus ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {job.description && (
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 bg-gray-50 rounded-lg px-3 py-2">
          {job.description}
        </p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>{job.location.join(" / ")}</span>
        {job.requirements && <span>{job.requirements}</span>}
        <span className="text-gray-400">·</span>
        <span>{job.jobType}</span>
        {job.deadline ? (
          <span className={urgent ? "text-red-600 font-semibold" : "text-gray-500"}>
            截止 {md(job.deadline)}
            {dl !== null && dl >= 0 ? ` · 剩 ${dl} 天` : ""}
          </span>
        ) : (
          <span className="text-emerald-600">滚动招聘</span>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 mt-auto border-t border-gray-100">
        <div className="flex flex-wrap gap-1.5 min-w-0">
          <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${CATEGORY_COLORS[job.category]}`}>
            {job.category}
          </span>
          {trackingStatus && (
            <select
              value={trackingStatus}
              onChange={(e) => onTrack?.(job.id, e.target.value as TrackingStatus)}
              className="text-xs px-1.5 py-0.5 rounded-md border border-gray-200 bg-white text-gray-600"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
          {job.tags.slice(0, 2).map((t) => (
            <span key={t} className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 truncate">
              {t}
            </span>
          ))}
        </div>
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-sm font-semibold text-white px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 transition"
        >
          投递 →
        </a>
      </div>
    </article>
  );
}
