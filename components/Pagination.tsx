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

  const pages: number[] = [];
  const from = Math.max(1, page - 2);
  const to = Math.min(totalPages, from + 4);
  for (let i = from; i <= to; i++) pages.push(i);

  return (
    <nav className="flex items-center justify-center gap-1 pt-6">
      <button
        className="px-3 py-1.5 rounded-md text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
      >
        ←
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPage(p)}
          className={`w-8 h-8 rounded-md text-xs font-medium transition ${
            p === page
              ? "bg-gray-900 text-white"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          {p}
        </button>
      ))}
      <button
        className="px-3 py-1.5 rounded-md text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
      >
        →
      </button>
    </nav>
  );
}
