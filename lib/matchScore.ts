import { RESUME_KEYWORDS } from "../config/resume.config";
import type { Job, JobAiTags, NormalizedJob, Prefs } from "./types";

function norm(s: string): string {
  return s.toLowerCase().replace(/[\s_\-·]/g, "");
}

export interface MatchResult {
  score: number;
  reasons: string[];
}

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

export function computeProfileMatch(job: Job, prefs: Prefs): number {
  return computeProfileMatchDetailed(job, prefs).score;
}

export function computeProfileMatchDetailed(job: Job, prefs: Prefs): MatchResult {
  const userSkills = [...(prefs.skills ?? []), ...(prefs.resumeKeywords ?? [])].map(norm);
  const userRoles = (prefs.targetRoles ?? []).map(norm);
  const userCategories = prefs.categories.map(norm);
  const userCities = prefs.cities;
  const reasons: string[] = [];

  if (userSkills.length === 0 && userRoles.length === 0 && userCategories.length === 0) {
    return { score: 0, reasons: [] };
  }

  const tags = job.aiTags;

  let score = 0;

  // Skill match (40%)
  if (userSkills.length > 0) {
    const jobSkills = tags ? tags.skills.map(norm) : [];
    const text = norm([job.title, job.description ?? "", ...job.tags].join(" "));
    const matched: string[] = [];

    for (const us of userSkills) {
      const hit = jobSkills.some((js) => js.includes(us) || us.includes(js)) || text.includes(us);
      if (hit) matched.push(us);
    }

    const skillScore = Math.min(matched.length / Math.max(userSkills.length * 0.2, 1), 1);
    score += 0.4 * skillScore;

    if (matched.length > 0) {
      const display = [...new Set(matched)].slice(0, 3).map((s) => {
        const original = [...(prefs.skills ?? []), ...(prefs.resumeKeywords ?? [])].find((o) => norm(o) === s);
        return original ?? s;
      });
      reasons.push(`技能匹配: ${display.join(", ")}`);
    }
  }

  // Role match (30%)
  if (userRoles.length > 0) {
    const titleNorm = norm(job.title);
    const roleNorm = tags ? norm(tags.roleType) : "";
    let roleMatch = false;

    for (const ur of userRoles) {
      if (titleNorm.includes(ur) || roleNorm.includes(ur) || ur.includes(roleNorm)) {
        const original = (prefs.targetRoles ?? []).find((o) => norm(o) === ur);
        reasons.push(`岗位方向: ${original ?? ur}`);
        roleMatch = true;
        break;
      }
    }
    score += roleMatch ? 0.3 : 0;
  }

  // Category match (15%)
  if (userCategories.length > 0) {
    const catNorm = norm(job.category);
    const indNorm = tags ? norm(tags.industry) : "";
    if (userCategories.some((c) => catNorm.includes(c) || indNorm.includes(c) || c.includes(catNorm))) {
      reasons.push(`行业匹配: ${job.category}`);
      score += 0.15;
    }
  }

  // City match (15%)
  if (userCities.length > 0) {
    const matchedCity = job.location.find((l) => userCities.some((c) => l.includes(c)));
    if (matchedCity) {
      reasons.push(`城市: ${matchedCity}`);
      score += 0.15;
    }
  }

  return { score: Math.min(1, score), reasons };
}
