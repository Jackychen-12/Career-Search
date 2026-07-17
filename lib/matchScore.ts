import { RESUME_KEYWORDS } from "../config/resume.config";
import { enrichJobContext, expandWithSynonyms, isRelatedRole } from "./matchEnrich";
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

  const expandedSkills = expandWithSynonyms(skills);
  const expandedRoles = expandWithSynonyms(roles);

  let skillHits = 0;
  for (const s of expandedSkills) { if (textIncludes(text, s)) skillHits++; }
  let roleHits = 0;
  for (const r of expandedRoles) { if (textIncludes(titleNorm, r) || textIncludes(text, r)) roleHits++; }

  const tierBonus = RESUME_KEYWORDS.targetCompanyTiers.includes(job.companyTier) ? 0.1 : 0;
  const categoryBonus = categories.includes(norm(job.category)) ? 0.15 : 0;
  const skillScore = Math.min(skillHits / Math.max(expandedSkills.length * 0.15, 1), 1);
  const roleScore = Math.min(roleHits / Math.max(expandedRoles.length * 0.15, 1), 1);

  return Math.min(1, skillScore * 0.35 + roleScore * 0.4 + tierBonus + categoryBonus);
}

export function computeProfileMatch(job: Job, prefs: Prefs): number {
  return computeProfileMatchDetailed(job, prefs).score;
}

export function computeProfileMatchDetailed(job: Job, prefs: Prefs): MatchResult {
  const rawUserSkills = [...(prefs.skills ?? []), ...(prefs.resumeKeywords ?? [])];
  const userSkills = rawUserSkills.map(norm);
  const expandedUserSkills = expandWithSynonyms(userSkills);

  const rawUserRoles = prefs.targetRoles ?? [];
  const userRoles = rawUserRoles.map(norm);
  const expandedUserRoles = expandWithSynonyms(userRoles);

  const userCategories = prefs.categories.map(norm);
  const userCities = prefs.cities;
  const userExps = prefs.experiences ?? [];
  const reasons: string[] = [];

  if (userSkills.length === 0 && userRoles.length === 0 && userCategories.length === 0) {
    return { score: 0, reasons: [] };
  }

  const tags = job.aiTags;
  const enriched = enrichJobContext(job);

  let score = 0;

  // Skill match (30%)
  if (expandedUserSkills.length > 0) {
    const jobSkills = tags ? tags.skills.map(norm) : enriched.inferredSkills.map(norm);
    const text = norm([job.title, job.description ?? "", job.company, ...job.tags].join(" "));
    const matched: string[] = [];

    for (const us of expandedUserSkills) {
      const hit = jobSkills.some((js) => js.includes(us) || us.includes(js)) || textIncludes(text, us);
      if (hit && !matched.includes(us)) matched.push(us);
    }

    const skillScore = Math.min(matched.length / Math.max(expandedUserSkills.length * 0.15, 1), 1);
    score += 0.30 * skillScore;

    if (matched.length > 0) {
      const display = [...new Set(matched)].slice(0, 3).map((s) => {
        const original = rawUserSkills.find((o) => norm(o) === s);
        return original ?? s;
      });
      reasons.push(`技能匹配: ${display.join(", ")}`);
    }
  }

  // Role match (20%, graduated)
  if (expandedUserRoles.length > 0) {
    const titleNorm = norm(job.title);
    const roleNorm = tags ? norm(tags.roleType) : "";
    const enrichedRoles = enriched.inferredRoles.map(norm);
    let bestRoleScore = 0;
    let bestRoleLabel = "";

    for (const ur of expandedUserRoles) {
      if (titleNorm.includes(ur) || (roleNorm && (roleNorm.includes(ur) || ur.includes(roleNorm)))) {
        if (bestRoleScore < 1.0) {
          bestRoleScore = 1.0;
          const original = rawUserRoles.find((o) => norm(o) === ur);
          bestRoleLabel = original ?? ur;
        }
      } else if (enrichedRoles.some((er) => er.includes(ur) || ur.includes(er))) {
        if (bestRoleScore < 0.6) {
          bestRoleScore = 0.6;
          const original = rawUserRoles.find((o) => norm(o) === ur);
          bestRoleLabel = original ?? ur;
        }
      } else if (isRelatedRole(ur, enrichedRoles)) {
        if (bestRoleScore < 0.3) {
          bestRoleScore = 0.3;
          const original = rawUserRoles.find((o) => norm(o) === ur);
          bestRoleLabel = original ?? ur;
        }
      }
    }

    score += 0.20 * bestRoleScore;
    if (bestRoleScore >= 0.3 && bestRoleLabel) {
      reasons.push(`岗位方向: ${bestRoleLabel}`);
    }
  }

  // Experience match (15%)
  if (userExps.length > 0) {
    const text = norm([job.title, job.description ?? "", ...job.tags].join(" "));
    const titleNorm = norm(job.title);
    const jobIndustry = tags ? norm(tags.industry) : norm(enriched.inferredIndustry);
    let expScore = 0;
    let bestExpReason = "";

    for (const exp of userExps) {
      let thisScore = 0;
      const expSkills = exp.skills.map(norm);
      const expandedExpSkills = expandWithSynonyms(expSkills);
      const expRole = norm(exp.role);
      const expIndustry = exp.industry ? norm(exp.industry) : "";

      if (expandedExpSkills.length > 0) {
        let hits = 0;
        for (const es of expandedExpSkills) {
          if (textIncludes(text, es)) hits++;
        }
        const enrichedSkillsNorm = enriched.inferredSkills.map(norm);
        for (const es of expandedExpSkills) {
          if (enrichedSkillsNorm.some((is) => is.includes(es) || es.includes(is))) hits++;
        }
        thisScore += 0.4 * Math.min(hits / Math.max(expandedExpSkills.length * 0.25, 1), 1);
      }

      if (expRole && (titleNorm.includes(expRole) || expRole.includes(titleNorm.slice(0, 4)))) {
        thisScore += 0.35;
      } else if (expRole) {
        const enrichedRolesNorm = enriched.inferredRoles.map(norm);
        if (enrichedRolesNorm.some((er) => er.includes(expRole) || expRole.includes(er))) {
          thisScore += 0.2;
        }
      }

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

  // Category match (15%, graduated)
  if (userCategories.length > 0) {
    const catNorm = norm(job.category);
    const indNorm = tags ? norm(tags.industry) : "";
    const enrichedIndNorm = norm(enriched.inferredIndustry);

    if (userCategories.some((c) => catNorm.includes(c) || indNorm.includes(c) || c.includes(catNorm))) {
      reasons.push(`行业匹配: ${job.category}`);
      score += 0.15;
    } else if (userCategories.some((c) => enrichedIndNorm.includes(c) || c.includes(enrichedIndNorm))) {
      reasons.push(`行业相关: ${enriched.inferredIndustry}`);
      score += 0.10;
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

  // Company relevance (10%)
  if (enriched.confidence > 0.2) {
    const enrichedSkillsNorm = enriched.inferredSkills.map(norm);
    const overlap = enrichedSkillsNorm.filter((s) =>
      expandedUserSkills.some((us) => s.includes(us) || us.includes(s)),
    ).length;
    const companyRelevance = Math.min(overlap / 2, 1);
    score += 0.10 * companyRelevance;
    if (companyRelevance >= 0.3) {
      reasons.push(`公司相关: ${job.company}`);
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
  const enriched = enrichJobContext(job);
  const expandedSkills = expandWithSynonyms(profile.skills.map(norm));
  const expandedRoles = expandWithSynonyms(profile.target_roles.map(norm));
  const text = norm([job.title, job.description ?? "", job.company, ...job.tags].join(" "));
  const jobSkills = enriched.inferredSkills.map(norm);

  if (expandedSkills.length > 0) {
    let hits = 0;
    for (const s of expandedSkills) {
      if (jobSkills.some((js) => js.includes(s) || s.includes(js)) || textIncludes(text, s)) hits++;
    }
    score += 0.35 * Math.min(hits / Math.max(expandedSkills.length * 0.2, 1), 1);
  }
  if (expandedRoles.length > 0) {
    const titleNorm = norm(job.title);
    const enrichedRoles = enriched.inferredRoles.map(norm);
    for (const r of expandedRoles) {
      if (textIncludes(titleNorm, r) || enrichedRoles.some((er) => er.includes(r) || r.includes(er))) {
        score += 0.25;
        break;
      }
    }
  }
  if (profile.categories.length > 0 && profile.categories.includes(job.category)) score += 0.15;
  if (profile.cities.length > 0 && job.location.some((l) => profile.cities.some((c) => l.includes(c)))) score += 0.15;

  if (enriched.confidence > 0.2) {
    const enrichedSkillsNorm = enriched.inferredSkills.map(norm);
    const overlap = enrichedSkillsNorm.filter((s) =>
      expandedSkills.some((us) => s.includes(us) || us.includes(s)),
    ).length;
    score += 0.10 * Math.min(overlap / 2, 1);
  }

  return Math.min(1, score);
}
