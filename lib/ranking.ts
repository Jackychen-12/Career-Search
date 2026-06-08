import { RANKING_WEIGHTS } from "../config/ranking.config";
import { computeProfileMatch } from "./matchScore";
import type { Job, Prefs } from "./types";

export function hasPrefs(prefs: Prefs | null | undefined): prefs is Prefs {
  return (
    !!prefs &&
    (prefs.categories.length > 0 || prefs.jobTypes.length > 0 || prefs.cities.length > 0 ||
     (prefs.skills ?? []).length > 0 || (prefs.targetRoles ?? []).length > 0 ||
     (prefs.resumeKeywords ?? []).length > 0)
  );
}

/** 0–1 match between a job and the user's profile. Uses AI tags when available. */
export function matchScore(job: Job, prefs: Prefs | null | undefined): number {
  if (!hasPrefs(prefs)) return 0;
  return computeProfileMatch(job, prefs);
}

/** Composite score including the personal match boost. */
export function finalScore(job: Job, prefs: Prefs | null | undefined): number {
  return job.scores.base + RANKING_WEIGHTS.match * matchScore(job, prefs);
}
