"use client";

import { CATEGORY_COLORS } from "@/lib/taxonomy";
import { daysUntil } from "@/lib/scoring";
import type { Job } from "@/lib/types";
import type { TrackingStatus } from "@/lib/tracker";

const STATUS_OPTIONS: { value: TrackingStatus; label: string }[] = [
  { value: "saved", label: "收藏" },
  { value: "applied", label: "已投" },
  { value: "interview", label: "面试" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "拒绝" },
];

function daysSince(iso: string | null, now: Date): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "今天";
  if (diff === 1) return "昨天";
  if (diff < 7) return `${diff}天前`;
  if (diff < 30) return `${Math.floor(diff / 7)}周前`;
  return `${Math.floor(diff / 30)}月前`;
}

export default function JobCard({
  job,
  now,
  isNew,
  trackingStatus,
  onTrack,
  profileMatch,
}: {
  job: Job;
  now: number;
  isNew?: boolean;
  trackingStatus?: TrackingStatus | null;
  onTrack?: (jobId: string, status: TrackingStatus | null) => void;
  profileMatch?: number;
}) {
  const dl = daysUntil(job.deadline, new Date(now));
  const urgent = dl !== null && dl >= 0 && dl <= 15;
  const published = daysSince(job.firstSeen, new Date(now));

  return (
    <article className="card p-4 flex flex-col gap-3">
      {/* Top row: category + badges */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[job.category]}`}>
            {job.category}
          </span>
          {job.tags.slice(0, 1).map((t) => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100/80 text-gray-500">
              {t}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {isNew && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600">
              NEW
            </span>
          )}
          {onTrack && (
            <button
              onClick={() => onTrack(job.id, trackingStatus ? null : "saved")}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                trackingStatus ? "text-red-500 bg-red-50" : "text-gray-300 hover:text-red-400"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill={trackingStatus ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Company + Title */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-gray-900">{job.company}</span>
          {job.salary && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-50 text-brand-600">
              {job.salary}
            </span>
          )}
        </div>
        <div className="text-[13px] text-brand-500 mt-1 line-clamp-2 leading-snug font-medium">
          {job.title}
        </div>
      </div>

      {/* Description */}
      {job.description && (
        <p className="text-[12px] text-gray-600 line-clamp-2 leading-relaxed">{job.description}</p>
      )}

      {/* Time info */}
      <div className="bg-gray-50/80 rounded-lg px-3 py-2 space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-gray-500">截止</span>
          {job.deadline ? (
            <span className={urgent ? "text-red-600 font-medium" : "text-gray-700"}>
              {job.deadline.slice(0, 10)}
              {dl !== null && dl >= 0 && <span className="text-gray-500 ml-1">剩{dl}天</span>}
              {dl !== null && dl < 0 && <span className="text-gray-500 ml-1">已过期</span>}
            </span>
          ) : (
            <span className="text-brand-500">滚动招聘</span>
          )}
        </div>
        {job.postedAt && (
          <div className="flex justify-between">
            <span className="text-gray-500">发布</span>
            <span className="text-gray-600">{job.postedAt.slice(0, 10)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">收录</span>
          <span className="text-gray-600">{published ?? job.firstSeen.slice(0, 10)}</span>
        </div>
      </div>

      {/* Meta: location + requirements */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100/80 text-gray-600">
          {job.location.join(" / ")}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100/80 text-gray-500">
          {job.jobType}
        </span>
        {job.requirements && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100/80 text-gray-500">
            {job.requirements}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 mt-auto border-t border-black/5">
        {trackingStatus ? (
          <select
            value={trackingStatus}
            onChange={(e) => onTrack?.(job.id, e.target.value as TrackingStatus)}
            className="text-[11px] px-2 py-1 rounded-lg border border-gray-200 text-gray-600"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <span className="text-[10px] text-gray-500" title={job.aiTags?.summary ?? ""}>
            {profileMatch != null && profileMatch > 0.2 && (
              <span className="inline-flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${profileMatch > 0.6 ? "bg-brand-500" : profileMatch > 0.4 ? "bg-brand-400" : "bg-gray-400"}`} />
                匹配 {Math.round(profileMatch * 100)}%
                {job.aiTags?.summary && <span className="hidden sm:inline ml-1 text-gray-500">· {job.aiTags.summary}</span>}
              </span>
            )}
          </span>
        )}
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] font-medium text-white px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 shadow-sm transition"
        >
          投递 →
        </a>
      </div>
    </article>
  );
}
