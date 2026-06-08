import type { Job, JobsQuery } from "./types";
import { finalScore, matchScore } from "./ranking";
import { daysUntil } from "./scoring";

export function paginate<T>(arr: T[], page: number, pageSize: number) {
  const total = arr.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return { items: arr.slice(start, start + pageSize), total, page: safePage, pageSize, totalPages };
}

/** Pure filter + sort over an in-memory job pool (shared by build + client). */
export function filterJobs(pool: Job[], q: JobsQuery, now: Date = new Date()): Job[] {
  const {
    category = "all",
    city = "all",
    jobType = "all",
    region = "all",
    keyword = "",
    urgentOnly = false,
    sort = "composite",
    prefs = null,
  } = q;

  let out = pool;
  if (category !== "all") out = out.filter((j) => j.category === category);
  if (jobType !== "all") out = out.filter((j) => j.jobType === jobType);
  if (region !== "all") out = out.filter((j) => j.region === region);
  if (city !== "all") out = out.filter((j) => j.location.some((l) => l.includes(city)));
  if (urgentOnly) {
    out = out.filter((j) => {
      const d = daysUntil(j.deadline, now);
      return d !== null && d >= 0 && d <= 15;
    });
  }
  if (keyword.trim()) {
    const k = keyword.trim().toLowerCase();
    out = out.filter(
      (j) =>
        j.company.toLowerCase().includes(k) ||
        j.title.toLowerCase().includes(k) ||
        (j.description ?? "").toLowerCase().includes(k) ||
        j.location.some((l) => l.toLowerCase().includes(k)) ||
        j.tags.some((t) => t.toLowerCase().includes(k)),
    );
  }

  const sorted = [...out];
  if (sort === "deadline") {
    sorted.sort((a, b) => {
      const da = daysUntil(a.deadline, now);
      const db = daysUntil(b.deadline, now);
      return (da ?? Infinity) - (db ?? Infinity);
    });
  } else if (sort === "fresh") {
    sorted.sort((a, b) => b.firstSeen.localeCompare(a.firstSeen));
  } else if (sort === "aiMatch") {
    sorted.sort((a, b) => matchScore(b, prefs) - matchScore(a, prefs));
  } else {
    sorted.sort((a, b) => finalScore(b, prefs) - finalScore(a, prefs));
  }
  return sorted;
}

export function queryJobs(pool: Job[], q: JobsQuery, now: Date = new Date()) {
  const { page = 1, pageSize = 12 } = q;
  return paginate(filterJobs(pool, q, now), page, pageSize);
}
