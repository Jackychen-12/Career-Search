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

/** 0–1 match between a job and the user's saved preferences. */
export function matchScore(job: Job, prefs: Prefs | null | undefined): number {
  if (!hasPrefs(prefs)) return 0;

  let score = 0;
  let max = 0;

  if (prefs.categories.length) {
    max += 1;
    if (prefs.categories.includes(job.category)) score += 1;
  }
  if (prefs.jobTypes.length) {
    max += 1;
    if (prefs.jobTypes.includes(job.jobType)) score += 1;
  }
  if (prefs.cities.length) {
    max += 1;
    if (job.location.some((l) => prefs.cities.some((c) => l.includes(c)))) score += 1;
  }

  const basicMatch = max === 0 ? 0 : score / max;

  const profileMatch = computeProfileMatch(job, {
    skills: prefs.skills,
    targetRoles: prefs.targetRoles,
    resumeKeywords: prefs.resumeKeywords,
    categories: prefs.categories,
  });

  return profileMatch > 0 ? profileMatch * 0.6 + basicMatch * 0.4 : basicMatch;
}

/** Composite score including the personal match boost. */
export function finalScore(job: Job, prefs: Prefs | null | undefined): number {
  return job.scores.base + RANKING_WEIGHTS.match * matchScore(job, prefs);
}
