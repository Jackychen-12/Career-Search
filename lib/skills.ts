const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || "https://career-search-oauth.keyu-chen.workers.dev";

async function callSkill<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${WORKER_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

export interface CoverLetterResult {
  letter: string;
  highlights: string[];
  tips: string;
}

export interface OfferCompareResult {
  comparison: { dimension: string; analysis: string }[];
  recommendation: string;
  reason: string;
  risks: string;
  negotiation: string;
}

export function generateInterview(profile: string, job: string) {
  return callSkill<{ questions: InterviewQuestion[] }>("/api/skill/interview", { profile, job });
}

export function polishResume(profile: string, job: string, experiences: string) {
  return callSkill<ResumePolishResult>("/api/skill/resume-polish", { profile, job, experiences });
}

export function generateCoverLetter(profile: string, job: string) {
  return callSkill<CoverLetterResult>("/api/skill/cover-letter", { profile, job });
}

export function compareOffers(profile: string, offers: string) {
  return callSkill<OfferCompareResult>("/api/skill/offer-compare", { profile, offers });
}
