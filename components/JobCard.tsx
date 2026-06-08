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
    <article className="card p-4 flex flex-col gap-3">
      {/* Top: category + tags + NEW */}
      <div className="flex items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded-md font-medium ${CATEGORY_COLORS[job.category]}`}>
            {job.category}
          </span>
          {job.tags.slice(0, 2).map((t) => (
            <span key={t} className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">
              {t}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isNew && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium text-[10px]">
              NEW
            </span>
          )}
          {onTrack && (
            <button
              onClick={() => onTrack(job.id, trackingStatus ? null : "saved")}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                trackingStatus ? "text-red-500 bg-red-50" : "text-gray-300 hover:text-red-400 hover:bg-red-50"
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill={trackingStatus ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Company + Title */}
      <div>
        <div className="text-base font-semibold leading-snug line-clamp-1">{job.company}</div>
        <div className="text-sm text-brand-600 mt-1 line-clamp-2">{job.title}</div>
      </div>

      {/* Description */}
      {job.description && (
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
          {job.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 mt-auto border-t border-gray-100 text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <span>{job.location.join(" / ")}</span>
          <span>{job.jobType}</span>
          {job.deadline ? (
            <span className={urgent ? "text-red-600 font-medium" : ""}>
              截止 {md(job.deadline)}
              {dl !== null && dl >= 0 ? ` · ${dl}天` : ""}
            </span>
          ) : (
            <span className="text-emerald-600">滚动招聘</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {trackingStatus && (
            <select
              value={trackingStatus}
              onChange={(e) => onTrack?.(job.id, e.target.value as TrackingStatus)}
              className="text-xs px-1.5 py-0.5 rounded border border-gray-200 bg-white text-gray-600"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 h-7 inline-flex items-center rounded-md text-xs font-medium bg-brand-500 text-white hover:bg-brand-600 transition"
          >
            投递 →
          </a>
        </div>
      </div>
    </article>
  );
}
