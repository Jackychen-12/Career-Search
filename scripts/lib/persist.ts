import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, META_PATH, STORE_PATH } from "../../lib/config";
import { finalizeJobs } from "../../lib/scoring";
import type { Job, RawJob } from "../../lib/types";
import { computeAiScores } from "./aiScore";

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
export async function buildAndWrite(
  raws: RawJob[],
  sources: Record<string, number>,
  errors: Record<string, string>,
): Promise<WriteResult> {
  const prev = loadPrevFirstSeen();
  const now = new Date();
  let jobs = finalizeJobs(raws, prev, now);

  // AI scoring (only for jobs that don't already have a high aiMatch from keyword rules)
  const aiScores = await computeAiScores(jobs);
  if (aiScores.size > 0) {
    jobs = jobs.map((j) => {
      const ai = aiScores.get(j.id);
      if (ai) {
        return { ...j, scores: { ...j.scores, aiMatch: Math.max(j.scores.aiMatch, ai.score) }, aiReason: ai.reason };
      }
      return j;
    });
    jobs.sort((a, b) => b.scores.base - a.scores.base);
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
