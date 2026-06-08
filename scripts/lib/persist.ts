import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, META_PATH, STORE_PATH } from "../../lib/config";
import { finalizeJobs } from "../../lib/scoring";
import type { Job, RawJob } from "../../lib/types";

/** Build an id -> firstSeen map from the previous snapshot (for accurate freshness). */
function loadPrevFirstSeen(): Map<string, string> {
  const map = new Map<string, string>();
  try {
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    const prev = JSON.parse(raw) as Job[];
    if (Array.isArray(prev)) {
      for (const j of prev) if (j.id && j.firstSeen) map.set(j.id, j.firstSeen);
    }
  } catch {
    // no previous snapshot — every job is "new".
  }
  return map;
}

export interface WriteResult {
  count: number;
  path: string;
  jobs: Job[];
}

/** Finalize raw jobs (dedupe + firstSeen diff + score + sort) and write the snapshot. */
export function buildAndWrite(
  raws: RawJob[],
  sources: Record<string, number>,
  errors: Record<string, string>,
): WriteResult {
  const prev = loadPrevFirstSeen();
  const now = new Date();
  const jobs = finalizeJobs(raws, prev, now);

  const prevIds = new Set(prev.keys());
  const newJobIds = jobs.filter((j) => !prevIds.has(j.id)).map((j) => j.id);
  const removedCount = [...prevIds].filter((id) => !jobs.some((j) => j.id === id)).length;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(jobs, null, 2) + "\n", "utf8");
  fs.writeFileSync(
    META_PATH,
    JSON.stringify(
      { fetchedAt: now.toISOString(), count: jobs.length, sources, errors },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(DATA_DIR, "diff.json"),
    JSON.stringify({ newJobIds, removedCount, date: now.toISOString().slice(0, 10) }, null, 2) + "\n",
    "utf8",
  );
  return { count: jobs.length, path: STORE_PATH, jobs };
}
