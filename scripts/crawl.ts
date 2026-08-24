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
import { nowcoder } from "./sources/nowcoder";
import { campusApis } from "./sources/official/campusApi";
import { ashby } from "./sources/ashby";
import { greenhouse } from "./sources/greenhouse";
import { lever } from "./sources/lever";
import { bytedance } from "./sources/official/bytedance";
// kuaishou, xiaohongshu — 端点已下线(HTTP 404)，待确认新端点后恢复
// import { kuaishou } from "./sources/official/kuaishou";
// import { xiaohongshu } from "./sources/official/xiaohongshu";
import { meituan } from "./sources/official/meituan";
import { baidu } from "./sources/official/baidu";
import { tencent } from "./sources/official/tencent";
import { openSourceRepos } from "./sources/opensourceRepo";
import { seed } from "./sources/seed";
import { shixiseng } from "./sources/shixiseng";
import type { SourceAdapter } from "./sources/types";

function selectAdapters(only: string[]): SourceAdapter[] {
  const universe: SourceAdapter[] = [];
  if (SOURCES_CONFIG.seed) universe.push(seed);
  if (SOURCES_CONFIG.ats) universe.push(greenhouse, lever, ashby);
  if (SOURCES_CONFIG.openSourceRepos) universe.push(openSourceRepos);
  // bytedance & meituan official APIs are down; campusApis covers fallbacks
  if (SOURCES_CONFIG.official) universe.push(baidu, tencent, campusApis);
  universe.push(nowcoder);
  universe.push(shixiseng);

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

function loadBossJobs(): RawJob[] {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, "boss-jobs.json"), "utf8");
    return JSON.parse(raw) as RawJob[];
  } catch { return []; }
}

export async function runCrawl(only: string[] = []): Promise<CrawlResult> {
  const adapters = selectAdapters(only);
  const sources: Record<string, number> = {};
  const errors: Record<string, string> = {};
  const all: RawJob[] = [];

  // Include boss-jobs.json if it exists (manually crawled)
  const bossJobs = loadBossJobs();
  if (bossJobs.length > 0) {
    all.push(...bossJobs);
    sources["boss"] = bossJobs.length;
  }

  const settled = await Promise.allSettled(
    adapters.map(async (a) => ({ id: a.id, items: await a.fetch() })),
  );
  settled.forEach((r, i) => {
    const a = adapters[i];
    if (r.status === "fulfilled") {
      sources[r.value.id] = r.value.items.length;
      all.push(...r.value.items);
      // A source that succeeds but yields nothing is broken too — record it so
      // meta.errors reflects reality and the status banner can surface it.
      // Without this, four dead sources sat at 0 for weeks unnoticed.
      if (r.value.items.length === 0) {
        errors[r.value.id] = "返回 0 条（接口可能已失效）";
      }
    } else {
      sources[a.id] = 0;
      errors[a.id] = String(r.reason?.message ?? r.reason).slice(0, 200);
    }
  });

  // Fetch campus events + wechat articles (best-effort), before buildAndWrite so
  // any failure here still lands in the meta.json it produces.
  // Only overwrite on a non-empty result: 搜狗 rate-limits often, and blindly
  // writing an empty array wipes the /events page until the next good run.
  try {
    const { events, articles } = await fetchAllEvents();
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (events.length > 0) {
      fs.writeFileSync(path.join(DATA_DIR, "events.json"), JSON.stringify(events, null, 2) + "\n", "utf8");
    } else {
      errors["events"] = "返回 0 条，保留上一次的 events.json";
      console.warn("[events] 0 条，保留旧数据");
    }
    if (articles.length > 0) {
      fs.writeFileSync(path.join(DATA_DIR, "articles.json"), JSON.stringify(articles, null, 2) + "\n", "utf8");
    } else {
      errors["articles"] = "返回 0 条，保留上一次的 articles.json";
      console.warn("[articles] 0 条，保留旧数据");
    }
  } catch (e) {
    errors["events"] = (e as Error).message.slice(0, 200);
    console.warn(`[events] Failed: ${(e as Error).message}`);
  }

  const { count, path: outPath } = await buildAndWrite(all, sources, errors);

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
