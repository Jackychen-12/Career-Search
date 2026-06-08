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
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0 overflow-x-auto">
          {jobs.map((j) => (
            <div key={j.id} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 border border-brand-100">
              <span className="text-xs font-medium text-brand-700 truncate max-w-[120px]">{j.company}</span>
              <button onClick={() => onRemove(j.id)} className="text-brand-400 hover:text-brand-600 text-sm leading-none">×</button>
            </div>
          ))}
          <span className="text-xs text-gray-400 shrink-0">
            {jobs.length}/3
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onClear} className="text-xs text-gray-500 hover:text-gray-700">清空</button>
          <button
            onClick={onCompare}
            disabled={jobs.length < 2}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-40 shadow-sm transition"
          >
            对比 ({jobs.length})
          </button>
        </div>
      </div>
    </div>
  );
}
