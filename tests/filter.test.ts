import { filterJobs, queryJobs } from "../lib/filter";
import type { Job } from "../lib/types";

const mockJobs: Job[] = [
  {
    id: "j1", origin: "seed", company: "字节跳动", companyTier: 1, title: "产品经理",
    category: "互联网", jobType: "秋招", location: ["北京"], region: "大陆",
    description: null, requirements: null, salary: null, deadline: "2026-09-30",
    postedAt: null, firstSeen: "2026-06-01T00:00:00Z", lastSeen: "2026-06-08T00:00:00Z",
    applyUrl: "https://example.com", detailUrl: null, tags: ["大厂"],
    scores: { urgency: 0.5, freshness: 0.8, tier: 1, base: 0.7, aiMatch: 0.5 },
  },
  {
    id: "j2", origin: "seed", company: "Goldman Sachs", companyTier: 1, title: "Analyst",
    category: "外企", jobType: "暑期实习", location: ["海外"], region: "海外",
    description: null, requirements: null, salary: null, deadline: "2026-10-15",
    postedAt: null, firstSeen: "2026-06-01T00:00:00Z", lastSeen: "2026-06-08T00:00:00Z",
    applyUrl: "https://example.com", detailUrl: null, tags: ["外资"],
    scores: { urgency: 0.3, freshness: 0.8, tier: 1, base: 0.6, aiMatch: 0.3 },
  },
  {
    id: "j3", origin: "seed", company: "中金", companyTier: 1, title: "投行分析师",
    category: "金融", jobType: "秋招", location: ["北京", "上海"], region: "大陆",
    description: null, requirements: null, salary: null, deadline: null,
    postedAt: null, firstSeen: "2026-06-05T00:00:00Z", lastSeen: "2026-06-08T00:00:00Z",
    applyUrl: "https://example.com", detailUrl: null, tags: ["头部券商"],
    scores: { urgency: 0.5, freshness: 0.9, tier: 1, base: 0.75, aiMatch: 0.4 },
  },
];

describe("filterJobs", () => {
  test("默认返回全部", () => {
    const result = filterJobs(mockJobs, {});
    expect(result).toHaveLength(3);
  });

  test("按行业多选筛选", () => {
    const result = filterJobs(mockJobs, { categories: ["互联网", "金融"] });
    expect(result).toHaveLength(2);
    expect(result.every((j) => j.category === "互联网" || j.category === "金融")).toBe(true);
  });

  test("按地区筛选", () => {
    const result = filterJobs(mockJobs, { region: "大陆" });
    expect(result).toHaveLength(2);
    expect(result.every((j) => j.region === "大陆")).toBe(true);
  });

  test("按城市多选", () => {
    const result = filterJobs(mockJobs, { cities: ["上海"] });
    expect(result).toHaveLength(1);
    expect(result[0].company).toBe("中金");
  });

  test("关键词搜索", () => {
    const result = filterJobs(mockJobs, { keyword: "字节" });
    expect(result).toHaveLength(1);
    expect(result[0].company).toBe("字节跳动");
  });

  test("排序 - 最新", () => {
    const result = filterJobs(mockJobs, { sort: "fresh" });
    expect(result[0].company).toBe("中金");
  });
});

describe("queryJobs", () => {
  test("分页", () => {
    const result = queryJobs(mockJobs, { page: 1, pageSize: 2 });
    expect(result.items).toHaveLength(2);
    expect(result.totalPages).toBe(2);
    expect(result.total).toBe(3);
  });

  test("第二页", () => {
    const result = queryJobs(mockJobs, { page: 2, pageSize: 2 });
    expect(result.items).toHaveLength(1);
  });
});
