import { RESUME_KEYWORDS } from "../config/resume.config";
import type { Job, JobAiTags, NormalizedJob, Prefs } from "./types";

function norm(s: string): string {
  return s.toLowerCase().replace(/[\s_\-·]/g, "");
}

/** Build-time fallback: keyword matching for jobs without AI tags. */
export function computeAiMatch(job: NormalizedJob): number {
  const text = norm([job.title, job.description ?? "", job.company, ...job.tags].join(" "));
  const titleNorm = norm(job.title);

  const skills = RESUME_KEYWORDS.skills.map(norm);
  const roles = RESUME_KEYWORDS.targetRoles.map(norm);
  const categories = (RESUME_KEYWORDS.targetCategories ?? []).map(norm);

  let skillHits = 0;
  for (const s of skills) { if (text.includes(s)) skillHits++; }
  let roleHits = 0;
  for (const r of roles) { if (titleNorm.includes(r) || text.includes(r)) roleHits++; }

  const tierBonus = RESUME_KEYWORDS.targetCompanyTiers.includes(job.companyTier) ? 0.1 : 0;
  const categoryBonus = categories.includes(norm(job.category)) ? 0.15 : 0;
  const skillScore = Math.min(skillHits / Math.max(skills.length * 0.25, 1), 1);
  const roleScore = Math.min(roleHits / Math.max(roles.length * 0.2, 1), 1);

  return Math.min(1, skillScore * 0.35 + roleScore * 0.4 + tierBonus + categoryBonus);
}

/** Client-side: compute match between a user's profile and a job's AI-extracted tags. */
export function computeProfileMatch(job: Job, prefs: Prefs): number {
  const userSkills = [...(prefs.skills ?? []), ...(prefs.resumeKeywords ?? [])].map(norm);
  const userRoles = (prefs.targetRoles ?? []).map(norm);
  const userCategories = prefs.categories.map(norm);
  const userCities = prefs.cities;

  if (userSkills.length === 0 && userRoles.length === 0 && userCategories.length === 0) return 0;

  const tags = job.aiTags;

  if (tags) {
    return matchWithAiTags(tags, userSkills, userRoles, userCategories, userCities, job);
  }
  return matchWithKeywords(job, userSkills, userRoles, userCategories, userCities);
}

function matchWithAiTags(
  tags: JobAiTags,
  userSkills: string[],
  userRoles: string[],
  userCategories: string[],
  userCities: string[],
  job: Job,
): number {
  let score = 0;
  let weights = 0;

  // Skill match (40%)
  if (userSkills.length > 0 && tags.skills.length > 0) {
    const jobSkills = tags.skills.map(norm);
    let hits = 0;
    for (const us of userSkills) {
      if (jobSkills.some((js) => js.includes(us) || us.includes(js))) hits++;
    }
    score += 0.4 * Math.min(hits / Math.max(userSkills.length * 0.2, 1), 1);
    weights += 0.4;
  }

  // Role type match (30%)
  if (userRoles.length > 0) {
    const roleNorm = norm(tags.roleType);
    const titleNorm = norm(job.title);
    let roleMatch = 0;
    for (const ur of userRoles) {
      if (roleNorm.includes(ur) || ur.includes(roleNorm) || titleNorm.includes(ur)) {
        roleMatch = 1;
        break;
      }
    }
    score += 0.3 * roleMatch;
    weights += 0.3;
  }

  // Industry/category match (15%)
  if (userCategories.length > 0) {
    const indNorm = norm(tags.industry);
    const catNorm = norm(job.category);
    const match = userCategories.some((c) => indNorm.includes(c) || catNorm.includes(c) || c.includes(indNorm));
    score += match ? 0.15 : 0;
    weights += 0.15;
  }

  // City match (15%)
  if (userCities.length > 0) {
    const cityMatch = job.location.some((l) => userCities.some((c) => l.includes(c)));
    score += cityMatch ? 0.15 : 0;
    weights += 0.15;
  }

  return weights > 0 ? Math.min(1, score / weights * (weights + 0.2)) : 0;
}

function matchWithKeywords(
  job: Job,
  userSkills: string[],
  userRoles: string[],
  userCategories: string[],
  userCities: string[],
): number {
  const text = norm([job.title, job.description ?? "", job.company, ...job.tags].join(" "));
  const titleNorm = norm(job.title);

  let score = 0;

  if (userSkills.length > 0) {
    let hits = 0;
    for (const s of userSkills) { if (text.includes(s)) hits++; }
    score += 0.4 * Math.min(hits / Math.max(userSkills.length * 0.2, 1), 1);
  }

  if (userRoles.length > 0) {
    let hits = 0;
    for (const r of userRoles) { if (titleNorm.includes(r) || text.includes(r)) hits++; }
    score += 0.35 * Math.min(hits / Math.max(userRoles.length * 0.15, 1), 1);
  }

  if (userCategories.length > 0) {
    const catMatch = userCategories.includes(norm(job.category));
    score += catMatch ? 0.15 : 0;
  }

  if (userCities.length > 0) {
    const cityMatch = job.location.some((l) => userCities.some((c) => l.includes(c)));
    score += cityMatch ? 0.1 : 0;
  }

  return Math.min(1, score);
}
