import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, META_PATH, STORE_PATH } from "../../lib/config";
import { finalizeJobs } from "../../lib/scoring";
import type { Job, JobAiTags, RawJob } from "../../lib/types";
import { extractAiTags } from "./aiScore";

/** Read the previous snapshot once; callers derive both firstSeen and aiTags from it. */
function loadPrevSnapshot(): Job[] {
  try {
    const prev = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as Job[];
    return Array.isArray(prev) ? prev : [];
  } catch {
    return []; // no previous snapshot — every job is "new".
  }
}

/** Build an id -> firstSeen map from the previous snapshot (for accurate freshness). */
function firstSeenMap(prev: Job[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const j of prev) if (j.id && j.firstSeen) map.set(j.id, j.firstSeen);
  return map;
}

/** Reuse AI tags already computed for a job id in the previous snapshot. */
function prevAiTags(prev: Job[]): Map<string, JobAiTags> {
  const map = new Map<string, JobAiTags>();
  for (const j of prev) if (j.id && j.aiTags) map.set(j.id, j.aiTags);
  return map;
}

export interface WriteResult {
  count: number;
  path: string;
  jobs: Job[];
}

/** Finalize raw jobs (dedupe + firstSeen diff + score + sort) and write the snapshot. */
export async function buildAndWrite(
  raws: RawJob[],
  sources: Record<string, number>,
  errors: Record<string, string>,
): Promise<WriteResult> {
  const prevSnapshot = loadPrevSnapshot();
  const prev = firstSeenMap(prevSnapshot);
  const now = new Date();
  let jobs = finalizeJobs(raws, prev, now);

  // Incremental AI tagging: reuse tags already computed for a job id, and only
  // call DeepSeek for the ids that are genuinely new. A full 1700-job pass
  // takes ~15min and blew the CI timeout; day-to-day only a handful are new,
  // so this drops the daily run to seconds and avoids re-billing tokens.
  const cachedTags = prevAiTags(prevSnapshot);
  jobs = jobs.map((j) => {
    const cached = cachedTags.get(j.id);
    return cached ? { ...j, aiTags: cached } : j;
  });

  const untagged = jobs.filter((j) => !j.aiTags);
  console.log(`[ai-tags] ${jobs.length - untagged.length} reused, ${untagged.length} new to tag`);
  const aiTags = await extractAiTags(untagged);
  if (aiTags.size > 0) {
    jobs = jobs.map((j) => {
      const tags = aiTags.get(j.id);
      return tags ? { ...j, aiTags: tags } : j;
    });
  }

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
