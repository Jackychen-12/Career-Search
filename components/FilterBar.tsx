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

function Chip({
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
      className={`shrink-0 px-2.5 py-1 rounded text-xs font-medium transition ${
        active
          ? "chip-active"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
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
      <span className="text-[11px] text-slate-400 shrink-0 w-8">{label}</span>
      <Chip active={value === "all"} onClick={() => onSelect("all")}>全部</Chip>
      {options.map((o) => (
        <Chip key={o} active={value === o} onClick={() => onSelect(o)}>{o}</Chip>
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
    <div className="card p-4 space-y-3">
      {/* Search + prefs */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={state.keyword}
            onChange={(e) => onChange({ keyword: e.target.value })}
            placeholder="搜索公司、岗位、城市..."
            className="w-full h-9 pl-9 pr-3 rounded-md border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:bg-white transition"
          />
        </div>
        <button
          onClick={onOpenPrefs}
          className={`px-3 h-9 rounded-md text-xs font-medium border transition ${
            prefsActive
              ? "bg-nav text-white border-nav"
              : "border-slate-200 text-slate-600 hover:border-slate-400"
          }`}
        >
          {prefsActive ? "偏好 ✓" : "偏好"}
        </button>
      </div>

      {/* Filter rows */}
      <Row label="行业" options={CATEGORIES} value={state.category} onSelect={(v) => onChange({ category: v })} />
      <Row label="城市" options={CITIES} value={state.city} onSelect={(v) => onChange({ city: v })} />
      <Row label="类型" options={JOB_TYPES} value={state.jobType} onSelect={(v) => onChange({ jobType: v })} />

      {/* Bottom: region + urgent + sort */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-slate-400 w-8">地区</span>
          <Chip active={state.region === "all"} onClick={() => onChange({ region: "all" })}>全部</Chip>
          {REGIONS.map((r) => (
            <Chip key={r} active={state.region === r} onClick={() => onChange({ region: r })}>{r}</Chip>
          ))}
          <label className="flex items-center gap-1.5 text-xs text-slate-600 ml-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={state.urgentOnly}
              onChange={(e) => onChange({ urgentOnly: e.target.checked })}
              className="w-3.5 h-3.5 rounded border-slate-300 accent-cyan-600"
            />
            紧急
          </label>
        </div>

        <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-md">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => onChange({ sort: s.key })}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                state.sort === s.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
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
