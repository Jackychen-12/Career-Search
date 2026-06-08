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

  const btn =
    "min-w-[36px] h-9 px-2 inline-flex items-center justify-center rounded-md text-sm border";

  return (
    <nav className="flex items-center justify-center gap-1.5 mt-6">
      <button
        className={`${btn} ${page <= 1 ? "border-gray-200 text-gray-300 cursor-not-allowed" : "border-gray-200 text-gray-600 hover:border-brand-500 hover:text-brand-600 bg-white"}`}
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
      >
        上一页
      </button>
      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`dot-${idx}`} className="px-1 text-gray-400">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={`${btn} ${
              p === page
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-gray-200 text-gray-600 hover:border-brand-500 hover:text-brand-600 bg-white"
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        className={`${btn} ${page >= totalPages ? "border-gray-200 text-gray-300 cursor-not-allowed" : "border-gray-200 text-gray-600 hover:border-brand-500 hover:text-brand-600 bg-white"}`}
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
      >
        下一页
      </button>
    </nav>
  );
}
