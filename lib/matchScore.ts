import { RESUME_KEYWORDS } from "../config/resume.config";
import type { Job, NormalizedJob, Prefs } from "./types";

function norm(s: string): string {
  return s.toLowerCase().replace(/[\s_\-·]/g, "");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function textIncludes(text: string, token: string): boolean {
  const isShortAscii = /^[a-z0-9+#]{1,4}$/.test(token);
  if (isShortAscii) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegex(token)}([^a-z0-9]|$)`).test(text);
  }
  return text.includes(token);
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
  for (const s of skills) { if (textIncludes(text, s)) skillHits++; }
  let roleHits = 0;
  for (const r of roles) { if (textIncludes(titleNorm, r) || textIncludes(text, r)) roleHits++; }

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
  const userExps = prefs.experiences ?? [];
  const reasons: string[] = [];

  if (userSkills.length === 0 && userRoles.length === 0 && userCategories.length === 0) {
    return { score: 0, reasons: [] };
  }

  const tags = job.aiTags;

  let score = 0;

  // Skill match (35%)
  if (userSkills.length > 0) {
    const jobSkills = tags ? tags.skills.map(norm) : [];
    const text = norm([job.title, job.description ?? "", ...job.tags].join(" "));
    const matched: string[] = [];

    for (const us of userSkills) {
      const hit = jobSkills.some((js) => js.includes(us) || us.includes(js)) || textIncludes(text, us);
      if (hit) matched.push(us);
    }

    const skillScore = Math.min(matched.length / Math.max(userSkills.length * 0.2, 1), 1);
    score += 0.35 * skillScore;

    if (matched.length > 0) {
      const display = [...new Set(matched)].slice(0, 3).map((s) => {
        const original = [...(prefs.skills ?? []), ...(prefs.resumeKeywords ?? [])].find((o) => norm(o) === s);
        return original ?? s;
      });
      reasons.push(`技能匹配: ${display.join(", ")}`);
    }
  }

  // Role match (25%)
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
    score += roleMatch ? 0.25 : 0;
  }

  // Experience match (15%)
  if (userExps.length > 0) {
    const text = norm([job.title, job.description ?? "", ...job.tags].join(" "));
    const titleNorm = norm(job.title);
    const jobIndustry = tags ? norm(tags.industry) : norm(job.category);
    let expScore = 0;
    let bestExpReason = "";

    for (const exp of userExps) {
      let thisScore = 0;
      const expSkills = exp.skills.map(norm);
      const expRole = norm(exp.role);
      const expIndustry = exp.industry ? norm(exp.industry) : "";

      // Experience skills vs job requirements
      if (expSkills.length > 0) {
        let hits = 0;
        for (const es of expSkills) {
          if (textIncludes(text, es)) hits++;
        }
        thisScore += 0.4 * Math.min(hits / Math.max(expSkills.length * 0.3, 1), 1);
      }

      // Experience role vs job title
      if (expRole && (titleNorm.includes(expRole) || expRole.includes(titleNorm.slice(0, 4)))) {
        thisScore += 0.35;
      }

      // Experience industry vs job industry
      if (expIndustry && (jobIndustry.includes(expIndustry) || expIndustry.includes(jobIndustry))) {
        thisScore += 0.25;
      }

      if (thisScore > expScore) {
        expScore = thisScore;
        bestExpReason = `${exp.company}·${exp.role}`;
      }
    }

    score += 0.15 * Math.min(expScore, 1);
    if (expScore > 0.2 && bestExpReason) {
      reasons.push(`经历相关: ${bestExpReason}`);
    }
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

  // City match (10%)
  if (userCities.length > 0) {
    const matchedCity = job.location.find((l) => userCities.some((c) => l.includes(c)));
    if (matchedCity) {
      reasons.push(`城市: ${matchedCity}`);
      score += 0.1;
    }
  }

  return { score: Math.min(1, score), reasons };
}

export interface SimpleProfile {
  skills: string[];
  target_roles: string[];
  categories: string[];
  cities: string[];
}

export function computeSimpleMatch(job: Job, profile: SimpleProfile): number {
  let score = 0;
  const text = norm([job.title, job.description ?? "", ...job.tags].join(" "));

  if (profile.skills.length > 0) {
    let hits = 0;
    for (const s of profile.skills) { if (textIncludes(text, norm(s))) hits++; }
    score += 0.4 * Math.min(hits / Math.max(profile.skills.length * 0.2, 1), 1);
  }
  if (profile.target_roles.length > 0) {
    for (const r of profile.target_roles) { if (textIncludes(text, norm(r))) { score += 0.3; break; } }
  }
  if (profile.categories.length > 0 && profile.categories.includes(job.category)) score += 0.15;
  if (profile.cities.length > 0 && job.location.some((l) => profile.cities.some((c) => l.includes(c)))) score += 0.15;

  return Math.min(1, score);
}
