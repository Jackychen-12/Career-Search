"use client";

export default function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
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

  const btn = "min-w-[34px] h-8 px-2 inline-flex items-center justify-center rounded-md text-xs border transition";

  return (
    <nav className="flex items-center justify-center gap-1.5 mt-6">
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
    </nav>
  );
}
