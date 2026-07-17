"use client";

import { CATEGORIES, CITIES, JOB_TYPES, REGIONS } from "@/lib/taxonomy";
import type { Category, JobType, Region, SortKey } from "@/lib/types";

export interface FilterState {
  categories: (Category | "all")[];
  cities: (string | "all")[];
  jobTypes: (JobType | "all")[];
  region: (Region | "all")[];
  keyword: string;
  urgentOnly: boolean;
  sort: SortKey;
}

function toggleValue<T extends string>(arr: T[], v: T, allKey: T): T[] {
  if (v === allKey) return [allKey];
  const without = arr.filter((x) => x !== allKey);
  const next = without.includes(v) ? without.filter((x) => x !== v) : [...without, v];
  return next.length === 0 ? [allKey] : next;
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
      className={`shrink-0 px-3 h-[30px] inline-flex items-center whitespace-nowrap rounded-full text-[13px] font-medium transition-all ${
        active
          ? "bg-white text-gray-900 shadow-sm border border-gray-300"
          : "text-gray-600 border border-gray-200 hover:border-gray-400 hover:text-gray-800 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function MultiRow<T extends string>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly T[];
  selected: (T | "all")[];
  onToggle: (v: T | "all") => void;
}) {
  const isAll = selected.includes("all" as T);
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-xs text-gray-400 shrink-0 mr-1 w-8">{label}</span>
      <Pill active={isAll} onClick={() => onToggle("all" as T)}>全部</Pill>
      {options.map((o) => (
        <Pill key={o} active={!isAll && selected.includes(o)} onClick={() => onToggle(o)}>{o}</Pill>
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
}: {
  state: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
}) {
  return (
    <div className="card p-4 sm:p-5 space-y-3">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={state.keyword}
          onChange={(e) => onChange({ keyword: e.target.value })}
          placeholder="搜索公司、岗位、城市..."
          className="w-full h-9 pl-9 pr-3 rounded-full border border-gray-200/80 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300/50 focus:border-gray-400 transition"
        />
      </div>

      <MultiRow
        label="行业"
        options={CATEGORIES}
        selected={state.categories}
        onToggle={(v) => onChange({ categories: toggleValue(state.categories, v, "all") })}
      />
      <MultiRow
        label="城市"
        options={CITIES}
        selected={state.cities}
        onToggle={(v) => onChange({ cities: toggleValue(state.cities, v, "all") })}
      />
      <MultiRow
        label="类型"
        options={JOB_TYPES}
        selected={state.jobTypes}
        onToggle={(v) => onChange({ jobTypes: toggleValue(state.jobTypes, v, "all") })}
      />

      <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-black/5">
        <div className="flex items-center gap-1">
          <MultiRow
            label="地区"
            options={REGIONS}
            selected={state.region}
            onToggle={(v) => onChange({ region: toggleValue(state.region, v, "all") })}
          />
          <label className="flex items-center gap-1.5 text-[13px] text-gray-600 ml-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={state.urgentOnly}
              onChange={(e) => onChange({ urgentOnly: e.target.checked })}
              className="accent-gray-700"
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
