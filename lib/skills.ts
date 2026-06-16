import { supabase } from "./supabase";

const WORKER_URL =
  typeof window !== "undefined"
    ? "/ai"
    : process.env.NEXT_PUBLIC_WORKER_URL || "https://career-search-oauth.keyu-chen.workers.dev";

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("请先登录后使用 AI 功能");
  return { Authorization: `Bearer ${token}` };
}

async function callSkill<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const auth = await getAuthHeader();
  const res = await fetch(`${WORKER_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `请求失败 (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export interface InterviewQuestion {
  question: string;
  category: string;
  difficulty: string;
  tips: string;
  sample: string;
}

export interface ResumePolishResult {
  suggestions: { original: string; improved: string; reason: string }[];
  overall: string;
  keywords: string[];
  score: number;
  scoreReason: string;
}

export interface ResumeOptimizeSuggestion {
  id: number;
  section: string;
  title: string;
  impact: string;
  tags: string[];
  original: string;
  improved: string;
  reason: string;
}

export interface ResumeOptimizeResult {
  originalScore: number;
  optimizedScore: number;
  suggestions: ResumeOptimizeSuggestion[];
  resumeOriginal: { sections: { title: string; content: string }[] };
  resume: { sections: { title: string; content: string }[] };
  directionAdvice?: {
    skillsRequired: string[];
    skillsBonus: string[];
    keyMetrics: string[];
    commonMistakes: string[];
  };
  keywords: string[];
  tips: string;
}

export interface CoverLetterResult {
  letter: string;
  highlights: string[];
  tips: string;
  changes?: string;
}

export interface OfferCompareResult {
  comparison: { dimension: string; analysis: string }[];
  recommendation: string;
  reason: string;
  risks: string;
  negotiation: string;
}

export interface JdMatchResult {
  matchScore: number;
  modules: { name: string; score: number; matched: string[]; missing: string[] }[];
  jdKeywords: string[];
  matchedKeywords: string[];
  suggestions: string[];
}

export interface CustomResumeResult {
  sections: { title: string; content: string }[];
  highlights: string[];
  keywordCoverage: number;
  tips: string;
}

export interface JdCompareResult {
  rankings: { rank: number; company: string; position: string; score: number; strengths: string[]; weaknesses: string[]; priority: string }[];
  strategy: string;
  timeline: string;
}

export interface DirectionTemplateResult {
  direction: string;
  overview: string;
  template: {
    objective: string;
    skillsRequired: string[];
    skillsBonus: string[];
    experienceTemplate: { type: string; example: string }[];
    educationFocus: string;
    selfIntro: string;
  };
  keyMetrics: string[];
  commonMistakes: string[];
  interviewFocus: string[];
  relatedDirections: string[];
}

export function generateInterview(profile: string, job: string) {
  return callSkill<{ questions: InterviewQuestion[] }>("/api/skill/interview", { profile, job });
}

export function followupInterview(profile: string, job: string, previous: string, followup: string) {
  return callSkill<{ questions: InterviewQuestion[] }>("/api/skill/interview-followup", { profile, job, previous, followup });
}

export function polishResume(profile: string, job: string, experiences: string) {
  return callSkill<ResumePolishResult>("/api/skill/resume-polish", { profile, job, experiences });
}

export function optimizeResume(profile: string, job: string, experiences: string) {
  return callSkill<ResumeOptimizeResult>("/api/skill/resume-optimize", { profile, job, experiences });
}

export function generateCoverLetter(profile: string, job: string) {
  return callSkill<CoverLetterResult>("/api/skill/cover-letter", { profile, job });
}

export function refineCoverLetter(profile: string, job: string, letter: string, instruction: string) {
  return callSkill<CoverLetterResult>("/api/skill/cover-letter-refine", { profile, job, letter, instruction });
}

export function compareOffers(profile: string, offers: string) {
  return callSkill<OfferCompareResult>("/api/skill/offer-compare", { profile, offers });
}

export function analyzeJdMatch(profile: string, job: string) {
  return callSkill<JdMatchResult>("/api/skill/jd-match", { profile, job });
}

export function generateCustomResume(profile: string, job: string, experiences: string) {
  return callSkill<CustomResumeResult>("/api/skill/custom-resume", { profile, job, experiences });
}

export function compareJds(profile: string, jobs: string) {
  return callSkill<JdCompareResult>("/api/skill/jd-compare", { profile, jobs });
}

export function getDirectionTemplate(profile: string, direction: string) {
  return callSkill<DirectionTemplateResult>("/api/skill/direction-template", { profile, direction });
}
