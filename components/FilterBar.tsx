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

function Tag({
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
      className={`px-2.5 py-1 rounded-md text-xs font-medium transition whitespace-nowrap ${
        active
          ? "bg-gray-900 text-white"
          : "bg-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100"
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
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-gray-400 w-10 shrink-0">{label}</span>
      <div className="flex flex-wrap gap-0.5">
        <Tag active={value === "all"} onClick={() => onSelect("all")}>全部</Tag>
        {options.map((o) => (
          <Tag key={o} active={value === o} onClick={() => onSelect(o)}>{o}</Tag>
        ))}
      </div>
    </div>
  );
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: "composite", label: "综合" },
  { key: "aiMatch", label: "AI匹配" },
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
    <div className="space-y-3">
      {/* Search + actions row */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={state.keyword}
            onChange={(e) => onChange({ keyword: e.target.value })}
            placeholder="搜索公司、岗位、城市..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 transition placeholder:text-gray-300"
          />
        </div>
        <button
          onClick={onOpenPrefs}
          className={`px-3 py-2.5 rounded-lg text-xs font-medium border transition ${
            prefsActive
              ? "border-brand-500 bg-brand-50 text-brand-700"
              : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
          }`}
        >
          {prefsActive ? "偏好 ✓" : "偏好"}
        </button>
      </div>

      {/* Filter tags */}
      <div className="space-y-1.5">
        <Row label="行业" options={CATEGORIES} value={state.category} onSelect={(v) => onChange({ category: v })} />
        <Row label="城市" options={CITIES} value={state.city} onSelect={(v) => onChange({ city: v })} />
        <Row label="类型" options={JOB_TYPES} value={state.jobType} onSelect={(v) => onChange({ jobType: v })} />
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {REGIONS.map((r) => (
              <Tag key={r} active={state.region === r} onClick={() => onChange({ region: state.region === r ? "all" : r })}>{r}</Tag>
            ))}
          </div>
          <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none ml-1">
            <input
              type="checkbox"
              checked={state.urgentOnly}
              onChange={(e) => onChange({ urgentOnly: e.target.checked })}
              className="w-3.5 h-3.5 rounded border-gray-300 accent-red-600"
            />
            紧急
          </label>
        </div>

        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => onChange({ sort: s.key })}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                state.sort === s.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
