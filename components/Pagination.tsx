"use client";

import { useState } from "react";

export default function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  const [jumpValue, setJumpValue] = useState("");

  if (totalPages <= 1) return null;

  const window = 2;
  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - window && i <= page + window)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  const handleJump = () => {
    const n = parseInt(jumpValue, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) {
      onPage(n);
      setJumpValue("");
    }
  };

  const btn = "min-w-[34px] h-8 px-2 inline-flex items-center justify-center rounded-md text-xs border transition";

  return (
    <nav className="flex flex-col items-center gap-3 mt-6">
      {/* Page buttons row */}
      <div className="flex items-center justify-center gap-1.5">
        <button
          className={`${btn} ${page <= 1 ? "border-slate-200 text-slate-300 cursor-not-allowed" : "border-slate-200 text-slate-600 hover:border-nav hover:text-nav bg-white"}`}
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
        >
          ‹ 上一页
        </button>
        {pages.map((p, idx) =>
          p === "..." ? (
            <span key={`dot-${idx}`} className="px-1 text-slate-400 text-xs">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`${btn} ${
                p === page
                  ? "border-nav bg-nav text-white font-medium"
                  : "border-slate-200 text-slate-600 hover:border-nav hover:text-nav bg-white"
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          className={`${btn} ${page >= totalPages ? "border-slate-200 text-slate-300 cursor-not-allowed" : "border-slate-200 text-slate-600 hover:border-nav hover:text-nav bg-white"}`}
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
        >
          下一页 ›
        </button>
      </div>

      {/* Jump-to-page row */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>共 {totalPages} 页，跳转到第</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={jumpValue}
          onChange={(e) => setJumpValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJump()}
          placeholder={String(page)}
          className="w-14 h-7 px-2 text-center text-xs border border-slate-200 rounded-md focus:border-nav focus:ring-1 focus:ring-nav/30 outline-none bg-white"
        />
        <span>页</span>
        <button
          onClick={handleJump}
          className="h-7 px-3 text-xs font-medium text-white rounded-md bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 transition"
        >
          GO
        </button>
      </div>
    </nav>
  );
}
