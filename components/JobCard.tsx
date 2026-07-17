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
  外企: "from-emerald-400 to-emerald-600",
  快消: "from-orange-400 to-orange-500",
  实体: "from-slate-400 to-slate-500",
  管培: "from-violet-400 to-violet-600",
  其他: "from-gray-300 to-gray-400",
};

const TIER_LABEL: Record<number, string> = { 1: "头部", 2: "", 3: "" };
const TIER_COLOR: Record<number, string> = { 1: "text-amber-700 bg-amber-100 ring-1 ring-amber-200", 2: "", 3: "" };

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

/** Always-visible smart analysis panel — generates insights from whatever data is available. */
function SmartAnalysis({ job, matchResult }: { job: Job; matchResult?: MatchResult }) {
  // Build keyword highlights from title + description
  const HIGHLIGHT_KEYWORDS: Record<string, string> = {
    "AI": "AI", "人工智能": "AI", "大模型": "大模型", "LLM": "LLM", "NLP": "NLP", "AIGC": "AIGC",
    "产品经理": "产品", "产品设计": "产品", "产品运营": "运营", "商业分析": "商分",
    "数据分析": "数据", "数据驱动": "数据", "算法": "算法", "研发": "研发",
    "投行": "投行", "投资银行": "投行", "资管": "资管", "金融": "金融", "风控": "风控",
    "研究": "研究", "策略": "策略", "运营": "运营", "市场": "市场", "销售": "销售",
    "管培": "管培", "管理培训": "管培", "实习": "实习",
    "Python": "Python", "Java": "Java", "SQL": "SQL", "TypeScript": "TS",
    "React": "React", "机器学习": "ML", "深度学习": "DL",
    "全栈": "全栈", "前端": "前端", "后端": "后端",
    "供应链": "供应链", "咨询": "咨询", "审计": "审计",
  };

  const text = [job.title, job.description ?? ""].join(" ");
  const matched = new Set<string>();
  for (const [keyword, label] of Object.entries(HIGHLIGHT_KEYWORDS)) {
    if (text.includes(keyword)) matched.add(label);
  }
  const skillTags = Array.from(matched).slice(0, 6);

  // Build analysis dimensions
  const dimensions: { label: string; value: string; color: string }[] = [];

  // Company tier
  if (job.companyTier === 1) {
    dimensions.push({ label: "公司", value: "头部企业", color: "text-amber-600" });
  } else if (job.companyTier === 2) {
    dimensions.push({ label: "公司", value: "知名企业", color: "text-blue-600" });
  }

  // Category + industry
  dimensions.push({ label: "行业", value: job.category, color: "text-gray-700" });

  // Job type
  dimensions.push({ label: "类型", value: job.jobType, color: "text-gray-700" });

  // Salary assessment
  if (job.salary) {
    dimensions.push({ label: "薪资", value: job.salary, color: "text-green-700" });
  }

  // Location count
  if (job.location.length > 2) {
    dimensions.push({ label: "城市", value: `${job.location.length}个城市可选`, color: "text-gray-600" });
  }

  // Has matchResult
  const hasMatch = matchResult && matchResult.score > 0;
  const matchPct = hasMatch ? Math.round(matchResult!.score * 100) : 0;

  // Build-time aiMatch score as fallback
  const aiMatchPct = Math.round((job.scores.aiMatch ?? 0) * 100);
  const displayPct = hasMatch ? matchPct : aiMatchPct;
  const displayReasons = hasMatch
    ? matchResult!.reasons.slice(0, 3)
    : aiMatchPct > 0
      ? (skillTags.length > 0 ? [`技能相关: ${skillTags.slice(0, 3).join(", ")}`] : [])
      : [];

  return (
    <div className="px-3 py-2.5 rounded-lg bg-gradient-to-br from-gray-50 to-gray-50/80 border border-gray-100">
      {/* Match score bar — always show */}
      <div className="flex items-center justify-between text-[11px] mb-1.5">
        <span className="text-gray-500 font-medium">岗位分析</span>
        <span className={`font-bold ${displayPct >= 70 ? "text-green-600" : displayPct >= 40 ? "text-amber-600" : "text-gray-500"}`}>
          匹配 {displayPct}%
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all ${
            displayPct >= 70
              ? "bg-gradient-to-r from-green-400 to-green-500"
              : displayPct >= 40
                ? "bg-gradient-to-r from-amber-400 to-amber-500"
                : "bg-gradient-to-r from-gray-300 to-gray-400"
          }`}
          style={{ width: `${Math.max(displayPct, 3)}%` }}
        />
      </div>

      {/* Match reasons or fallback dimensions */}
      {displayReasons.length > 0 ? (
        <div className="text-[10px] text-gray-700 font-medium line-clamp-1 mb-1.5">
          {displayReasons.join(" · ")}
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-1.5">
          {dimensions.slice(0, 4).map((d) => (
            <span key={d.label} className="text-[10px]">
              <span className="text-gray-400">{d.label}</span>{" "}
              <span className={`font-medium ${d.color}`}>{d.value}</span>
            </span>
          ))}
        </div>
      )}

      {/* Skill tags — always show if available */}
      {skillTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {skillTags.map((s) => (
            <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-700">
              {s}
            </span>
          ))}
        </div>
      )}

      {/* AI summary if available */}
      {job.aiTags?.summary && (
        <p className="text-[10px] text-gray-500 mt-1.5 line-clamp-1 leading-relaxed">{job.aiTags.summary}</p>
      )}
    </div>
  );
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
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 animate-pulse">
                NEW
              </span>
            )}
            {onCompareToggle && (
              <button
                onClick={() => onCompareToggle(job.id)}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition text-[10px] ${
                  comparing ? "bg-gray-800 text-white" : "text-gray-300 hover:text-gray-600 hover:bg-gray-100"
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
          <a href={`/job/${job.id}`} className="text-[15px] font-bold text-gray-900 hover:text-gray-600 transition truncate">{job.company}</a>
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
            <span className="text-[10px] text-gray-500 font-medium mr-0.5">技能</span>
            {job.aiTags.skills.slice(0, 5).map((s) => (
              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
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
              {dl !== null && dl >= 0 && <span className={`ml-1 font-semibold ${dl <= 7 ? "text-red-500" : dl <= 15 ? "text-orange-500" : "text-green-600"}`}>({dl}天)</span>}
              {dl !== null && dl < 0 && <span className="text-gray-400 ml-1">已过期</span>}
            </span>
          ) : (
            <span className="text-teal-600 font-medium">滚动招聘</span>
          )}
          <span className="text-gray-300">|</span>
          <span>收录 {published ?? job.firstSeen.slice(0, 10)}</span>
        </div>

        <div className="mt-auto space-y-2.5 pt-1">
        {/* Smart Analysis — always visible */}
        <SmartAnalysis job={job} matchResult={matchResult} />

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
