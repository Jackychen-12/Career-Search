"use client";

import { CATEGORIES, CITIES, JOB_TYPES, REGIONS } from "@/lib/taxonomy";
import type { Category, JobType, Region, SortKey } from "@/lib/types";

export interface FilterState {
  category: Category | "all";
  city: string | "all";
  jobType: JobType | "all";
  region: Region | "all";
  keyword: string;
  urgentOnly: boolean;
  sort: SortKey;
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 h-8 inline-flex items-center rounded-full text-[13px] transition ${
        active
          ? "bg-brand-500 text-white shadow-sm"
          : "text-gray-600 hover:text-brand-600 hover:bg-brand-50"
      }`}
    >
      {children}
    </button>
  );
}

function Row<T extends string>({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: readonly T[];
  value: T | "all";
  onSelect: (v: T | "all") => void;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto scroll-hide">
      <span className="text-xs text-gray-400 shrink-0 mr-1 w-8">{label}</span>
      <Pill active={value === "all"} onClick={() => onSelect("all")}>全部</Pill>
      {options.map((o) => (
        <Pill key={o} active={value === o} onClick={() => onSelect(o)}>{o}</Pill>
      ))}
    </div>
  );
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: "composite", label: "综合" },
  { key: "aiMatch", label: "AI 匹配" },
  { key: "deadline", label: "截止" },
  { key: "fresh", label: "最新" },
];

export default function FilterBar({
  state,
  onChange,
  onOpenPrefs,
  prefsActive,
}: {
  state: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onOpenPrefs: () => void;
  prefsActive: boolean;
}) {
  return (
    <div className="card p-4 sm:p-5 space-y-3">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={state.keyword}
            onChange={(e) => onChange({ keyword: e.target.value })}
            placeholder="搜索公司、岗位、城市..."
            className="w-full h-9 pl-9 pr-3 rounded-full border border-gray-200/80 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition"
          />
        </div>
        <button
          onClick={onOpenPrefs}
          className={`px-4 h-9 rounded-full text-[13px] font-medium transition ${
            prefsActive
              ? "bg-brand-500 text-white shadow-sm"
              : "border border-gray-200 text-gray-600 hover:border-brand-400 hover:text-brand-600"
          }`}
        >
          {prefsActive ? "画像 ✓" : "设置画像"}
        </button>
      </div>

      {/* Filter rows */}
      <Row label="行业" options={CATEGORIES} value={state.category} onSelect={(v) => onChange({ category: v })} />
      <Row label="城市" options={CITIES} value={state.city} onSelect={(v) => onChange({ city: v })} />
      <Row label="类型" options={JOB_TYPES} value={state.jobType} onSelect={(v) => onChange({ jobType: v })} />

      {/* Bottom: region + urgent + sort */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-black/5">
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 mr-1">地区</span>
          <Pill active={state.region === "all"} onClick={() => onChange({ region: "all" })}>全部</Pill>
          {REGIONS.map((r) => (
            <Pill key={r} active={state.region === r} onClick={() => onChange({ region: r })}>{r}</Pill>
          ))}
          <label className="flex items-center gap-1.5 text-[13px] text-gray-600 ml-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={state.urgentOnly}
              onChange={(e) => onChange({ urgentOnly: e.target.checked })}
              className="accent-brand-500"
            />
            仅看紧急
          </label>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 mr-1">排序</span>
          {SORTS.map((s) => (
            <Pill key={s.key} active={state.sort === s.key} onClick={() => onChange({ sort: s.key })}>
              {s.label}
            </Pill>
          ))}
        </div>
      </div>
    </div>
  );
}
