import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, META_PATH, STORE_PATH } from "./config";
import { finalizeJobs } from "./scoring";
import type { Job, JobsDiff, JobsMeta } from "./types";
import { SEED_JOBS } from "../scripts/sources/seed";

/** Read the crawled snapshot. Returns [] when missing/invalid. */
export function readJobs(): Job[] {
  try {
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Job[]) : [];
  } catch {
    return [];
  }
}

export function readMeta(): JobsMeta | null {
  try {
    const raw = fs.readFileSync(META_PATH, "utf8");
    const m = JSON.parse(raw);
    return {
      fetchedAt: m.fetchedAt ?? null,
      count: Number(m.count ?? 0),
      sources: m.sources ?? {},
      errors: m.errors ?? {},
    };
  } catch {
    return null;
  }
}

export function readDiff(): JobsDiff | null {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, "diff.json"), "utf8");
    return JSON.parse(raw) as JobsDiff;
  } catch {
    return null;
  }
}

/**
 * Data for the static build. Uses the committed snapshot when present; otherwise
 * (fresh clone / `npm run dev` before a crawl) falls back to the seed list so the
 * site is never empty.
 */
export function getBuildData(): { jobs: Job[]; meta: JobsMeta | null; diff: JobsDiff | null } {
  const jobs = readJobs();
  if (jobs.length > 0) return { jobs, meta: readMeta(), diff: readDiff() };
  return { jobs: finalizeJobs(SEED_JOBS, undefined, new Date()), meta: null, diff: null };
}
