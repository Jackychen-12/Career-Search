import type { JobsMeta } from "@/lib/types";

function fmt(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16).replace("T", " ");
}

export default function SourceStatusBanner({ meta }: { meta: JobsMeta | null }) {
  if (!meta) {
    return (
      <div className="text-xs text-[var(--text-t)]">
        当前为种子示例数据（尚未运行爬取）。运行 <code className="px-1 bg-[rgba(0,0,0,0.04)] rounded">npm run crawl</code> 获取实时岗位。
      </div>
    );
  }

  const ok = Object.entries(meta.sources).filter(([, n]) => n > 0);
  const failed = Object.keys(meta.errors);

  return (
    <div className="text-xs text-[var(--text-t)] flex flex-wrap items-center gap-x-3 gap-y-1">
      <span>数据更新于 {fmt(meta.fetchedAt)}（UTC）· 共 {meta.count} 条</span>
      {ok.length > 0 && <span>来源：{ok.map(([id, n]) => `${id} ${n}`).join(" · ")}</span>}
      {failed.length > 0 && (
        <span className="text-amber-500" title={Object.values(meta.errors).join("\n")}>
          {failed.length} 个来源今日未更新
        </span>
      )}
    </div>
  );
}
