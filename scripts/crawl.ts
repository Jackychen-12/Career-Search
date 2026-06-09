/**
 * Crawl orchestrator.
 *
 *   npm run crawl                    # all enabled sources
 *   npm run crawl -- --only=greenhouse,seed
 *
 * Each source adapter runs in parallel; one failure never sinks the run. Results
 * are merged, deduped, scored and written to data/jobs.json + data/meta.json.
 * Runs locally and in CI right before the static build.
 */
import fs from "node:fs";
import path from "node:path";
import { SOURCES_CONFIG } from "../config/sources.config";
import { DATA_DIR } from "../lib/config";
import type { RawJob } from "../lib/types";
import { buildAndWrite } from "./lib/persist";
import { fetchAllEvents } from "./sources/events";
import { ashby } from "./sources/ashby";
import { greenhouse } from "./sources/greenhouse";
import { lever } from "./sources/lever";
import { bytedance } from "./sources/official/bytedance";
import { kuaishou } from "./sources/official/kuaishou";
import { meituan } from "./sources/official/meituan";
import { xiaohongshu } from "./sources/official/xiaohongshu";
import { openSourceRepos } from "./sources/opensourceRepo";
import { seed } from "./sources/seed";
import type { SourceAdapter } from "./sources/types";

function selectAdapters(only: string[]): SourceAdapter[] {
  const universe: SourceAdapter[] = [];
  if (SOURCES_CONFIG.seed) universe.push(seed);
  if (SOURCES_CONFIG.ats) universe.push(greenhouse, lever, ashby);
  if (SOURCES_CONFIG.openSourceRepos) universe.push(openSourceRepos);
  if (SOURCES_CONFIG.official) universe.push(bytedance, meituan, kuaishou, xiaohongshu);

  if (only.length > 0) {
    return universe.filter((a) => only.some((o) => a.id === o || a.id.startsWith(o)));
  }
  return universe;
}

export interface CrawlResult {
  total: number;
  written: number;
  sources: Record<string, number>;
  errors: Record<string, string>;
  path: string;
}

export async function runCrawl(only: string[] = []): Promise<CrawlResult> {
  const adapters = selectAdapters(only);
  const sources: Record<string, number> = {};
  const errors: Record<string, string> = {};
  const all: RawJob[] = [];

  const settled = await Promise.allSettled(
    adapters.map(async (a) => ({ id: a.id, items: await a.fetch() })),
  );
  settled.forEach((r, i) => {
    const a = adapters[i];
    if (r.status === "fulfilled") {
      sources[r.value.id] = r.value.items.length;
      all.push(...r.value.items);
    } else {
      sources[a.id] = 0;
      errors[a.id] = String(r.reason?.message ?? r.reason).slice(0, 200);
    }
  });

  const { count, path: outPath } = await buildAndWrite(all, sources, errors);

  // Fetch campus events + wechat articles (best-effort)
  try {
    const { events, articles } = await fetchAllEvents();
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(path.join(DATA_DIR, "events.json"), JSON.stringify(events, null, 2) + "\n", "utf8");
    fs.writeFileSync(path.join(DATA_DIR, "articles.json"), JSON.stringify(articles, null, 2) + "\n", "utf8");
  } catch (e) {
    console.warn(`[events] Failed: ${(e as Error).message}`);
  }

  return { total: all.length, written: count, sources, errors, path: outPath };
}

function parseOnly(argv: string[]): string[] {
  const arg = argv.find((a) => a.startsWith("--only="));
  return arg ? arg.slice("--only=".length).split(",").map((s) => s.trim()).filter(Boolean) : [];
}

async function main() {
  const only = parseOnly(process.argv.slice(2));
  console.log(`[crawl] starting${only.length ? ` (only: ${only.join(", ")})` : ""} ...`);
  const t0 = Date.now();
  const res = await runCrawl(only);

  console.log("[crawl] per-source:");
  for (const [id, n] of Object.entries(res.sources)) {
    const err = res.errors[id] ? `  ✗ ${res.errors[id]}` : "";
    console.log(`  - ${id.padEnd(18)} ${String(n).padStart(4)}${err}`);
  }
  console.log(`[crawl] merged ${res.total} raw -> ${res.written} unique jobs`);
  console.log(`[crawl] wrote ${res.path}`);
  console.log(`[crawl] done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (res.written === 0) process.exitCode = 1;
}

const isCli = process.argv[1]
  ? path.basename(process.argv[1]).replace(/\.(ts|js|mjs)$/, "") === "crawl"
  : false;
if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
