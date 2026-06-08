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
      className={`px-3 py-1 rounded-full text-sm border transition whitespace-nowrap ${
        active
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-gray-200 bg-white text-gray-600 hover:border-brand-500 hover:text-brand-600"
      }`}
    >
      {children}
    </button>
  );
}

function Group<T extends string>({
  title,
  options,
  value,
  onSelect,
}: {
  title: string;
  options: readonly T[];
  value: T | "all";
  onSelect: (v: T | "all") => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-gray-400 shrink-0 pt-1.5 w-8">{title}</span>
      <div className="flex flex-wrap gap-2">
        <Pill active={value === "all"} onClick={() => onSelect("all")}>
          全部
        </Pill>
        {options.map((o) => (
          <Pill key={o} active={value === o} onClick={() => onSelect(o)}>
            {o}
          </Pill>
        ))}
      </div>
    </div>
  );
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: "composite", label: "综合推荐" },
  { key: "aiMatch", label: "AI 匹配" },
  { key: "deadline", label: "最近截止" },
  { key: "fresh", label: "最新发布" },
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
    <div className="card p-4 sm:p-5 flex flex-col gap-3.5">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={state.keyword}
          onChange={(e) => onChange({ keyword: e.target.value })}
          placeholder="搜索公司 / 岗位 / 城市 / 关键词…"
          className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-brand-500"
        />
        <button
          onClick={onOpenPrefs}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
            prefsActive
              ? "border-brand-600 bg-brand-50 text-brand-700"
              : "border-gray-200 bg-white text-gray-600 hover:border-brand-500"
          }`}
        >
          {prefsActive ? "已设置个性化 ✓" : "设置我的方向"}
        </button>
      </div>

      <Group title="行业" options={CATEGORIES} value={state.category} onSelect={(v) => onChange({ category: v })} />
      <Group title="城市" options={CITIES} value={state.city} onSelect={(v) => onChange({ city: v })} />
      <Group title="类型" options={JOB_TYPES} value={state.jobType} onSelect={(v) => onChange({ jobType: v })} />

      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
        <span className="text-xs text-gray-400 w-8">地区</span>
        <Pill active={state.region === "all"} onClick={() => onChange({ region: "all" })}>
          全部
        </Pill>
        {REGIONS.map((r) => (
          <Pill key={r} active={state.region === r} onClick={() => onChange({ region: r })}>
            {r}
          </Pill>
        ))}
        <label className="flex items-center gap-1.5 text-sm text-gray-600 ml-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={state.urgentOnly}
            onChange={(e) => onChange({ urgentOnly: e.target.checked })}
            className="accent-brand-600"
          />
          仅看临近截止
        </label>

        <div className="flex gap-1.5 ml-auto">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => onChange({ sort: s.key })}
              className={`px-3 py-1 rounded-lg text-sm transition ${
                state.sort === s.key
                  ? "bg-brand-50 text-brand-700 font-medium"
                  : "text-gray-500 hover:text-brand-600"
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
