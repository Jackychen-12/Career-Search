import { supabase } from "./supabase";
import type { Prefs } from "./types";

const KEY = "career-search:prefs:v1";

export const EMPTY_PREFS: Prefs = { categories: [], jobTypes: [], cities: [] };

export function loadPrefs(): Prefs {
  if (typeof window === "undefined") return EMPTY_PREFS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_PREFS;
    const p = JSON.parse(raw);
    return {
      categories: Array.isArray(p.categories) ? p.categories : [],
      jobTypes: Array.isArray(p.jobTypes) ? p.jobTypes : [],
      cities: Array.isArray(p.cities) ? p.cities : [],
      school: p.school,
      major: p.major,
      degree: p.degree,
      skills: Array.isArray(p.skills) ? p.skills : [],
      targetRoles: Array.isArray(p.targetRoles) ? p.targetRoles : [],
      resumeKeywords: Array.isArray(p.resumeKeywords) ? p.resumeKeywords : [],
      experience: Array.isArray(p.experience) ? p.experience : [],
      experiences: Array.isArray(p.experiences) ? p.experiences : [],
      strengths: Array.isArray(p.strengths) ? p.strengths : [],
      weaknesses: Array.isArray(p.weaknesses) ? p.weaknesses : [],
      summary: p.summary,
    };
  } catch {
    return EMPTY_PREFS;
  }
}

export function savePrefs(p: Prefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
  syncPrefsToCloud(p);
}


async function syncPrefsToCloud(p: Prefs) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("profiles").upsert({
    id: user.id,
    school: p.school ?? null,
    major: p.major ?? null,
    degree: p.degree ?? null,
    skills: p.skills ?? [],
    target_roles: p.targetRoles ?? [],
    resume_keywords: p.resumeKeywords ?? [],
    categories: p.categories ?? [],
    job_types: p.jobTypes ?? [],
    cities: p.cities ?? [],
    experiences: p.experiences ?? [],
    strengths: p.strengths ?? [],
    weaknesses: p.weaknesses ?? [],
    summary: p.summary ?? null,
    notify_email: p.notifyEmail ?? null,
    notify_enabled: p.notifyEnabled ?? false,
    updated_at: new Date().toISOString(),
  });
}
