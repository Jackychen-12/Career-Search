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
  互联网: "bg-brand-50 text-brand-600",
  金融: "bg-amber-50 text-amber-700",
  外企: "bg-emerald-50 text-emerald-700",
  快消: "bg-pink-50 text-pink-700",
  实体: "bg-sky-50 text-sky-700",
  管培: "bg-violet-50 text-violet-700",
  其他: "bg-gray-100 text-gray-600",
};

export function isCategory(s: string | null | undefined): s is Category {
  return !!s && (CATEGORIES as string[]).includes(s);
}

export function isJobType(s: string | null | undefined): s is JobType {
  return !!s && (JOB_TYPES as string[]).includes(s);
}
