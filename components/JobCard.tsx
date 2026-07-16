"use client";

import { CATEGORY_COLORS } from "@/lib/taxonomy";
import { daysUntil } from "@/lib/scoring";
import type { Job } from "@/lib/types";
import type { TrackingStatus } from "@/lib/tracker";
import type { MatchResult } from "@/lib/matchScore";

const STATUS_OPTIONS: { value: TrackingStatus; label: string }[] = [
  { value: "saved", label: "收藏" },
  { value: "applied", label: "已投" },
  { value: "written", label: "笔试" },
  { value: "interview", label: "面试" },
  { value: "hr", label: "HR面" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "已拒" },
  { value: "withdrawn", label: "放弃" },
];

const CATEGORY_BAR_COLORS: Record<string, string> = {
  互联网: "from-indigo-400 to-indigo-600",
  金融: "from-amber-400 to-amber-600",
  外企: "from-blue-400 to-blue-600",
  快消: "from-rose-400 to-rose-600",
  实体: "from-slate-400 to-slate-500",
  管培: "from-violet-400 to-violet-600",
  其他: "from-gray-300 to-gray-400",
};

const TIER_LABEL: Record<number, string> = { 1: "头部", 2: "", 3: "" };
const TIER_COLOR: Record<number, string> = { 1: "text-amber-600 bg-amber-50", 2: "", 3: "" };

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
  matchResult,
  comparing,
  onCompareToggle,
}: {
  job: Job;
  now: number;
  isNew?: boolean;
  trackingStatus?: TrackingStatus | null;
  onTrack?: (jobId: string, status: TrackingStatus | null) => void;
  matchResult?: MatchResult;
  comparing?: boolean;
  onCompareToggle?: (jobId: string) => void;
}) {
  const dl = daysUntil(job.deadline, new Date(now));
  const urgent = dl !== null && dl >= 0 && dl <= 15;
  const published = daysSince(job.firstSeen, new Date(now));
  const barColor = CATEGORY_BAR_COLORS[job.category] ?? CATEGORY_BAR_COLORS["其他"];
  const tierLabel = TIER_LABEL[job.companyTier];
  const tierColor = TIER_COLOR[job.companyTier];

  return (
    <article className="card p-0 overflow-hidden flex flex-col">
      {/* Top color bar */}
      <div className={`h-1 bg-gradient-to-r ${barColor}`} />

      <div className="p-4 flex flex-col gap-2.5 flex-1">
        {/* Row 1: category + tier + tags + actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[11px] px-2.5 py-0.5 rounded-lg font-medium ${CATEGORY_COLORS[job.category]}`}>
              {job.category}
            </span>
            {tierLabel && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tierColor}`}>
                ★ {tierLabel}
              </span>
            )}
            {job.jobType && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                {job.jobType}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isNew && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600 animate-pulse">
                NEW
              </span>
            )}
            {onCompareToggle && (
              <button
                onClick={() => onCompareToggle(job.id)}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition text-[10px] ${
                  comparing ? "bg-brand-500 text-white" : "text-gray-300 hover:text-brand-500 hover:bg-brand-50"
                }`}
                title="加入对比"
              >
                ⇄
              </button>
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

        {/* Row 2: Company + Salary */}
        <div className="flex items-center gap-2">
          <a href={`/job/${job.id}`} className="text-[15px] font-bold text-gray-900 hover:text-brand-600 transition truncate">{job.company}</a>
          {job.salary && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 whitespace-nowrap shrink-0">
              💰 {job.salary}
            </span>
          )}
        </div>

        {/* Row 3: Title */}
        <div className="text-[13px] text-gray-800 line-clamp-2 leading-snug font-semibold">
          {job.title}
        </div>

        {/* Row 4: Description — expanded to 3 lines */}
        {job.description && (
          <p className="text-[12px] text-gray-600 line-clamp-3 leading-relaxed">{job.description}</p>
        )}

        {/* Row 5: Requirements */}
        {job.requirements && (
          <div className="text-[11px] text-gray-500 flex items-center gap-1">
            <span className="text-gray-400">要求:</span>
            <span className="font-medium text-gray-600">{job.requirements}</span>
          </div>
        )}

        {/* Row 6: Location tags */}
        <div className="flex flex-wrap gap-1.5">
          {job.location.slice(0, 5).map((loc) => (
            <span key={loc} className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
              📍 {loc}
            </span>
          ))}
          {job.tags.slice(0, 2).map((t) => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200">
              {t}
            </span>
          ))}
        </div>

        {/* Row 7: AI skills tags */}
        {job.aiTags && job.aiTags.skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-[10px] text-brand-500 font-medium mr-0.5">技能</span>
            {job.aiTags.skills.slice(0, 5).map((s) => (
              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-600">
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Row 8: Deadline & freshness — compact inline */}
        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          {job.deadline ? (
            <span className={urgent ? "text-red-600 font-medium" : ""}>
              截止 {job.deadline.slice(5, 10).replace("-", "/")}
              {dl !== null && dl >= 0 && <span className={`ml-1 font-semibold ${dl <= 7 ? "text-red-500" : dl <= 15 ? "text-amber-500" : "text-green-600"}`}>({dl}天)</span>}
              {dl !== null && dl < 0 && <span className="text-gray-400 ml-1">已过期</span>}
            </span>
          ) : (
            <span className="text-brand-500 font-medium">滚动招聘</span>
          )}
          <span className="text-gray-300">|</span>
          <span>收录 {published ?? job.firstSeen.slice(0, 10)}</span>
        </div>

        <div className="mt-auto space-y-2.5 pt-1">
        {/* AI Match section */}
        {matchResult && matchResult.score > 0 && (
          <div className="px-3 py-2 rounded-lg bg-brand-50/60 border border-brand-100/50">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-gray-500 font-medium">匹配度</span>
              <span className="font-bold text-brand-600">{Math.round(matchResult.score * 100)}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
              <div
                className="h-full bg-gradient-to-r from-brand-400 to-brand-500 rounded-full transition-all"
                style={{ width: `${Math.round(matchResult.score * 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-brand-700 font-medium line-clamp-1">
              {matchResult.reasons.slice(0, 3).join(" · ")}
            </div>
          </div>
        )}

        {/* AI summary (only if no match result) */}
        {!(matchResult && matchResult.score > 0) && job.aiTags?.summary && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-gray-50/80">
            <span className="shrink-0 text-[10px] font-semibold text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded">AI</span>
            <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">{job.aiTags.summary}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-black/5">
          <div className="flex-1 min-w-0">
            {trackingStatus && (
              <select
                value={trackingStatus}
                onChange={(e) => onTrack?.(job.id, e.target.value as TrackingStatus)}
                className="text-[11px] px-2 py-1 rounded-lg border border-gray-200 text-gray-600"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}
          </div>
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-medium text-white px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 shadow-sm transition"
          >
            投递 →
          </a>
        </div>
        </div>
      </div>
    </article>
  );
}
