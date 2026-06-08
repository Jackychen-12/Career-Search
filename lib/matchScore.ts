import { RESUME_KEYWORDS } from "../config/resume.config";
import type { NormalizedJob } from "./types";

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_\-·]/g, "");
}

const SKILL_SET = RESUME_KEYWORDS.skills.map(normalize);
const ROLE_SET = RESUME_KEYWORDS.targetRoles.map(normalize);
const CATEGORY_SET = (RESUME_KEYWORDS.targetCategories ?? []).map(normalize);

function textOf(job: NormalizedJob): string {
  return normalize(
    [job.title, job.description ?? "", job.company, ...job.tags].join(" "),
  );
}

export function computeAiMatch(job: NormalizedJob): number {
  const text = textOf(job);
  const titleNorm = normalize(job.title);

  let skillHits = 0;
  for (const s of SKILL_SET) {
    if (text.includes(s)) skillHits++;
  }

  let roleHits = 0;
  for (const r of ROLE_SET) {
    if (titleNorm.includes(r) || text.includes(r)) roleHits++;
  }

  const tierBonus = RESUME_KEYWORDS.targetCompanyTiers.includes(job.companyTier) ? 0.1 : 0;
  const categoryBonus = CATEGORY_SET.includes(normalize(job.category)) ? 0.15 : 0;

  const skillScore = Math.min(skillHits / Math.max(SKILL_SET.length * 0.25, 1), 1);
  const roleScore = Math.min(roleHits / Math.max(ROLE_SET.length * 0.2, 1), 1);

  return Math.min(1, skillScore * 0.35 + roleScore * 0.4 + tierBonus + categoryBonus);
}

/** Client-side match using user profile from localStorage prefs. */
export function computeProfileMatch(
  job: NormalizedJob,
  profile: { skills?: string[]; targetRoles?: string[]; resumeKeywords?: string[]; categories?: string[] },
): number {
  const text = textOf(job);
  const titleNorm = normalize(job.title);

  const allKeywords = [
    ...(profile.skills ?? []),
    ...(profile.resumeKeywords ?? []),
  ].map(normalize);

  const roles = (profile.targetRoles ?? []).map(normalize);
  const categories = (profile.categories ?? []).map(normalize);

  if (allKeywords.length === 0 && roles.length === 0 && categories.length === 0) return 0;

  let keywordHits = 0;
  for (const k of allKeywords) {
    if (text.includes(k)) keywordHits++;
  }

  let roleHits = 0;
  for (const r of roles) {
    if (titleNorm.includes(r) || text.includes(r)) roleHits++;
  }

  const categoryMatch = categories.includes(normalize(job.category)) ? 0.2 : 0;

  const keywordScore = allKeywords.length > 0
    ? Math.min(keywordHits / Math.max(allKeywords.length * 0.2, 1), 1)
    : 0;
  const roleScore = roles.length > 0
    ? Math.min(roleHits / Math.max(roles.length * 0.15, 1), 1)
    : 0;

  return Math.min(1, keywordScore * 0.4 + roleScore * 0.4 + categoryMatch);
}
