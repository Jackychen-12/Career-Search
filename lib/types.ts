// Domain model shared by the crawler (build time) and the UI (browser).

export type Category = "互联网" | "金融" | "外企" | "快消" | "实体" | "管培" | "其他";
export type JobType = "暑期实习" | "秋招" | "日常实习" | "校招";
export type Region = "大陆" | "香港" | "海外";

/** What a source adapter produces before the pipeline finalizes it. */
export interface RawJob {
  origin: string; // adapter id, e.g. "greenhouse" | "seed" | "official:bytedance"
  company: string;
  companyTier?: number; // 1 = 头部/大厂, 2 = 知名, 3 = 其他
  title: string;
  category?: Category;
  jobType?: JobType;
  location?: string[];
  region?: Region;
  description?: string | null;
  requirements?: string | null;
  salary?: string | null;
  deadline?: string | null; // ISO date
  postedAt?: string | null;
  applyUrl: string;
  detailUrl?: string | null;
  tags?: string[];
}

export interface JobScores {
  urgency: number; // 0–1, closer deadline -> higher
  freshness: number; // 0–1, more recently seen -> higher
  tier: number; // 0–1, from companyTier
  base: number; // 0–1, weighted composite (user-independent)
  aiMatch: number; // 0–1, client-side profile match (computed in browser)
}

/** AI-extracted structured attributes for each job (build-time, profile-independent). */
export interface JobAiTags {
  skills: string[];
  roleType: string;
  industry: string;
  seniority: string;
  summary: string;
}

export interface Job {
  id: string;
  origin: string;
  company: string;
  companyTier: number;
  title: string;
  category: Category;
  jobType: JobType;
  location: string[];
  region: Region;
  description: string | null;
  requirements: string | null;
  salary: string | null;
  deadline: string | null;
  postedAt: string | null;
  firstSeen: string;
  lastSeen: string;
  applyUrl: string;
  detailUrl: string | null;
  tags: string[];
  scores: JobScores;
  aiTags?: JobAiTags;
}

/** Normalized job before firstSeen/scores are attached. */
export type NormalizedJob = Omit<Job, "firstSeen" | "lastSeen" | "scores" | "aiReason">;

/** User preferences, stored in the browser (no account, no server). */
export interface Prefs {
  categories: Category[];
  jobTypes: JobType[];
  cities: string[];
  school?: string;
  major?: string;
  degree?: "本科" | "硕士" | "博士" | "";
  skills?: string[];
  targetRoles?: string[];
  resumeKeywords?: string[];
  experience?: string[];
  strengths?: string[];
  weaknesses?: string[];
  summary?: string;
  notifyEmail?: string;
  notifyEnabled?: boolean;
}

export type SortKey = "composite" | "deadline" | "fresh" | "aiMatch";

export interface JobsQuery {
  category?: Category | "all";
  city?: string | "all";
  jobType?: JobType | "all";
  region?: (Region | "all")[];
  keyword?: string;
  urgentOnly?: boolean;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
  prefs?: Prefs | null;
}

export interface JobsMeta {
  fetchedAt: string | null;
  count: number;
  sources: Record<string, number>;
  errors: Record<string, string>;
}

export interface JobsDiff {
  newJobIds: string[];
  removedCount: number;
  date: string;
}
