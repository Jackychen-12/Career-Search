import type { Category, JobType, Region } from "./types";

export const CATEGORIES: Category[] = [
  "互联网",
  "金融",
  "外企",
  "快消",
  "实体",
  "管培",
  "其他",
];

export const JOB_TYPES: JobType[] = ["暑期实习", "秋招", "日常实习", "校招"];

export const REGIONS: Region[] = ["大陆", "香港", "海外"];

/** Cities offered in the filter bar (order matters for display). */
export const CITIES = [
  "北京",
  "上海",
  "深圳",
  "广州",
  "杭州",
  "成都",
  "南京",
  "武汉",
  "西安",
  "香港",
  "海外",
  "远程",
];

export const CATEGORY_COLORS: Record<Category, string> = {
  互联网: "bg-[var(--cat-internet-bg)] text-[#5b4cff]",
  金融: "bg-[var(--cat-finance-bg)] text-[#F59E0B]",
  外企: "bg-[var(--cat-foreign-bg)] text-[#10B981]",
  快消: "bg-[var(--cat-fmcg-bg)] text-[#F97316]",
  实体: "bg-[var(--cat-entity-bg)] text-[#78716c]",
  管培: "bg-[var(--cat-trainee-bg)] text-[#8B5CF6]",
  其他: "bg-gray-100 text-gray-500",
};

export function isCategory(s: string | null | undefined): s is Category {
  return !!s && (CATEGORIES as string[]).includes(s);
}

export function isJobType(s: string | null | undefined): s is JobType {
  return !!s && (JOB_TYPES as string[]).includes(s);
}
