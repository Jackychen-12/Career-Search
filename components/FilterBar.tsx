"use client";

import { CATEGORIES, CITIES, JOB_TYPES, REGIONS } from "@/lib/taxonomy";
import type { Category, JobType, Region, SortKey } from "@/lib/types";

const CATEGORY_PILL_COLORS: Record<string, { bg: string; text: string }> = {
  "互联网": { bg: "rgba(91,76,255,.12)", text: "#5b4cff" },
  "金融": { bg: "rgba(245,158,11,.12)", text: "#D97706" },
  "外企": { bg: "rgba(16,185,129,.12)", text: "#059669" },
  "快消": { bg: "rgba(249,115,22,.12)", text: "#EA580C" },
  "实体": { bg: "rgba(120,113,108,.12)", text: "#78716c" },
  "管培": { bg: "rgba(139,92,246,.12)", text: "#7C3AED" },
  "其他": { bg: "rgba(0,0,0,.06)", text: "#6B7280" },
};

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
  activeStyle,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  activeStyle?: { bg: string; text: string };
}) {
  const customActive = active && activeStyle;
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 h-[30px] inline-flex items-center whitespace-nowrap rounded-full text-[13px] font-medium transition-all ${
        customActive
          ? "border-transparent shadow-[var(--shadow-sm)]"
          : active
            ? "bg-brand-500 text-white border-transparent shadow-[var(--shadow-sm)]"
            : "text-[var(--text-s)] border border-[var(--border)] hover:border-brand-500 hover:text-brand-500"
      }`}
      style={customActive ? { backgroundColor: activeStyle!.bg, color: activeStyle!.text } : undefined}
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
  colorMap,
}: {
  label: string;
  options: readonly T[];
  selected: (T | "all")[];
  onToggle: (v: T | "all") => void;
  colorMap?: Record<string, { bg: string; text: string }>;
}) {
  const isAll = selected.includes("all" as T);
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-xs text-[var(--text-t)] shrink-0 mr-1 w-8">{label}</span>
      <Pill active={isAll} onClick={() => onToggle("all" as T)}>全部</Pill>
      {options.map((o) => (
        <Pill key={o} active={!isAll && selected.includes(o)} onClick={() => onToggle(o)} activeStyle={colorMap?.[o]}>{o}</Pill>
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
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-t)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={state.keyword}
          onChange={(e) => onChange({ keyword: e.target.value })}
          placeholder="搜索公司、岗位、城市..."
          className="w-full h-9 pl-9 pr-3 rounded-[var(--radius-xs)] border border-[var(--border-s)] bg-[var(--surface-solid)]/80 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--border-s)]/50 focus:border-[var(--border-s)] transition"
        />
      </div>

      <MultiRow
        label="行业"
        options={CATEGORIES}
        selected={state.categories}
        onToggle={(v) => onChange({ categories: toggleValue(state.categories, v, "all") })}
        colorMap={CATEGORY_PILL_COLORS}
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
          <label className="flex items-center gap-1.5 text-[13px] text-[var(--text-s)] ml-3 cursor-pointer select-none">
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
          <span className="text-xs text-[var(--text-t)] mr-1">排序</span>
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
