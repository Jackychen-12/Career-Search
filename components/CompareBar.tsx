"use client";

import type { Job } from "@/lib/types";

export default function CompareBar({
  jobs,
  onRemove,
  onCompare,
  onClear,
}: {
  jobs: Job[];
  onRemove: (id: string) => void;
  onCompare: () => void;
  onClear: () => void;
}) {
  if (jobs.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface)] backdrop-blur-[8px] [backdrop-filter:blur(8px)_saturate(180%)] border-t border-[var(--border)] shadow-lg print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0 overflow-x-auto">
          {jobs.map((j) => (
            <div key={j.id} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-xs)] bg-brand-50 border border-brand-100">
              <span className="text-xs font-medium text-brand-700 truncate max-w-[120px]">{j.company}</span>
              <button onClick={() => onRemove(j.id)} className="text-brand-400 hover:text-brand-500 text-sm leading-none">×</button>
            </div>
          ))}
          <span className="text-xs text-[var(--text-t)] shrink-0">
            {jobs.length}/3
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onClear} className="text-xs text-[var(--text-s)] hover:text-[var(--text)]">清空</button>
          <button
            onClick={onCompare}
            disabled={jobs.length < 2}
            className="px-4 py-2 rounded-[var(--radius-xs)] text-sm font-semibold text-white bg-brand-500 hover:bg-brand-500 disabled:opacity-40 shadow-[var(--shadow-sm)] transition"
          >
            对比 ({jobs.length})
          </button>
        </div>
      </div>
    </div>
  );
}
