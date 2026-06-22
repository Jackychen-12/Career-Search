import {
  FRESHNESS_WINDOW_DAYS,
  RANKING_WEIGHTS,
  TIER_SCORE,
  URGENCY_WINDOW_DAYS,
} from "../config/ranking.config";
import { computeAiMatch } from "./matchScore";
import type {
  Category,
  Job,
  JobScores,
  JobType,
  NormalizedJob,
  RawJob,
  Region,
} from "./types";

const DAY = 24 * 60 * 60 * 1000;

function clamp(x: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, x));
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Days from `now` until the deadline (negative = passed). Null when no/invalid deadline. */
export function daysUntil(deadline: string | null | undefined, now: Date = new Date()): number | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((startOfDay(d) - startOfDay(now)) / DAY);
}

/** Stable, dependency-free string hash (djb2 -> base36). Works in browser + Node. */
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "").replace(/[（）()【】\[\]·,，。.]/g, "");
}

export function computeId(company: string, title: string, location: string[]): string {
  return "j" + hash(`${norm(company)}|${norm(title)}|${norm((location[0] ?? ""))}`);
}

const OVERSEAS_HINTS =
  /(海外|overseas|remote.?global|singapore|新加坡|美国|硅谷|seattle|new york|london|伦敦|tokyo|东京|欧洲|europe|us\b|usa|uk\b)/i;
const HK_HINTS = /(香港|hong\s?kong|hk\b)/i;

export function detectRegion(location: string[], explicit?: Region): Region {
  if (explicit) return explicit;
  const text = location.join(" ");
  if (HK_HINTS.test(text)) return "香港";
  if (OVERSEAS_HINTS.test(text)) return "海外";
  return "大陆";
}

export function detectJobType(title: string, fallback?: JobType): JobType {
  const t = title.toLowerCase();
  if (/暑期|summer|暑假/.test(title) || /summer/.test(t)) return "暑期实习";
  if (/秋招|秋季|autumn|fall|校园招聘|校招|提前批|campus|graduate|应届|全职/.test(title)) return "秋招";
  if (/(日常实习|长期实习|long.?term intern|daily)/i.test(title)) return "日常实习";
  if (/实习|intern/i.test(t)) return fallback ?? "日常实习";
  return fallback ?? "秋招";
}

export function normalizeCategory(c?: Category | string): Category {
  if (!c) return "其他";
  const map: Record<string, Category> = {
    互联网: "互联网",
    金融: "金融",
    外企: "外企",
    快消: "快消",
    实体: "实体",
    管培: "管培",
    实体企业: "实体",
    管培生: "管培",
    咨询: "金融",
  };
  return map[c] ?? (CATEGORY_SET.has(c as Category) ? (c as Category) : "其他");
}

const CATEGORY_SET = new Set<Category>([
  "互联网",
  "金融",
  "外企",
  "快消",
  "实体",
  "管培",
  "其他",
]);

export function normalizeRaw(raw: RawJob): NormalizedJob {
  const company = raw.company.trim();
  const title = raw.title.trim();
  const location =
    raw.location && raw.location.length ? raw.location.map((l) => l.trim()).filter(Boolean) : ["未知"];
  const region = detectRegion(location, raw.region);
  return {
    id: computeId(company, title, location),
    origin: raw.origin,
    company,
    companyTier: raw.companyTier ?? 2,
    title,
    category: normalizeCategory(raw.category),
    jobType: raw.jobType ?? detectJobType(title),
    location,
    region,
    description: raw.description ?? null,
    requirements: raw.requirements ?? null,
    salary: raw.salary ?? null,
    deadline: raw.deadline ?? null,
    postedAt: raw.postedAt ?? null,
    applyUrl: raw.applyUrl,
    detailUrl: raw.detailUrl ?? null,
    tags: dedupeTags(raw.tags ?? []),
  };
}

function dedupeTags(tags: string[]): string[] {
  return [...new Set(tags.map((t) => t.trim()).filter(Boolean))].slice(0, 6);
}

function richness(n: NormalizedJob): number {
  return (
    (n.description ? 2 : 0) +
    (n.salary ? 1 : 0) +
    (n.requirements ? 1 : 0) +
    (n.deadline ? 1 : 0) +
    n.tags.length * 0.1
  );
}

/** Fill nulls in `primary` from `secondary`, union tags. */
function merge(primary: NormalizedJob, secondary: NormalizedJob): NormalizedJob {
  return {
    ...primary,
    companyTier: Math.min(primary.companyTier, secondary.companyTier),
    description: primary.description ?? secondary.description,
    requirements: primary.requirements ?? secondary.requirements,
    salary: primary.salary ?? secondary.salary,
    deadline: primary.deadline ?? secondary.deadline,
    postedAt: primary.postedAt ?? secondary.postedAt,
    detailUrl: primary.detailUrl ?? secondary.detailUrl,
    tags: dedupeTags([...primary.tags, ...secondary.tags]),
  };
}

export function scoreJob(n: NormalizedJob, firstSeen: string, now: Date): JobScores {
  // urgency
  const dl = daysUntil(n.deadline, now);
  let urgency: number;
  if (dl === null) urgency = 0.5;
  else if (dl <= 0) urgency = 0;
  else urgency = clamp(1 - dl / URGENCY_WINDOW_DAYS, 0.05, 1);

  // freshness
  const ageDays = Math.max(0, (now.getTime() - new Date(firstSeen).getTime()) / DAY);
  const freshness = clamp(1 - ageDays / FRESHNESS_WINDOW_DAYS, 0, 1);

  // tier
  const tier = TIER_SCORE[n.companyTier] ?? 0.5;

  const { urgency: wU, freshness: wF, tier: wT } = RANKING_WEIGHTS;
  const sum = wU + wF + wT;
  const base = (wU * urgency + wF * freshness + wT * tier) / sum;

  // ai match (resume keyword similarity)
  const aiMatch = computeAiMatch(n);

  return { urgency, freshness, tier, base, aiMatch };
}

/**
 * Pure pipeline tail: normalize -> dedupe/merge -> drop expired -> attach
 * firstSeen (from previous snapshot when available) -> score -> sort.
 * Used by the crawler (with a prev-snapshot map) and by the dev/empty fallback.
 */
export function finalizeJobs(
  raws: RawJob[],
  prevFirstSeen: Map<string, string> | undefined,
  now: Date = new Date(),
): Job[] {
  const nowIso = now.toISOString();
  const byId = new Map<string, NormalizedJob>();

  for (const raw of raws) {
    if (!raw.company?.trim() || !raw.title?.trim() || !raw.applyUrl) continue;
    const n = normalizeRaw(raw);
    const prev = byId.get(n.id);
    if (!prev) byId.set(n.id, n);
    else byId.set(n.id, richness(n) >= richness(prev) ? merge(n, prev) : merge(prev, n));
  }

  const today0 = startOfDay(now);
  const jobs: Job[] = [];
  for (const n of byId.values()) {
    if (n.deadline) {
      const d = new Date(n.deadline);
      if (!Number.isNaN(d.getTime()) && startOfDay(d) < today0) continue; // expired
    }
    const firstSeen = prevFirstSeen?.get(n.id) ?? nowIso;
    jobs.push({ ...n, firstSeen, lastSeen: nowIso, scores: scoreJob(n, firstSeen, now) });
  }

  jobs.sort((a, b) => b.scores.base - a.scores.base);
  return jobs;
}
