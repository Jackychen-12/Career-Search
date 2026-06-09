import { computeProfileMatchDetailed } from "../lib/matchScore";
import type { Job, Prefs } from "../lib/types";

const mockJob: Job = {
  id: "test1",
  origin: "seed",
  company: "字节跳动",
  companyTier: 1,
  title: "AI 产品经理",
  category: "互联网",
  jobType: "秋招",
  location: ["北京", "上海"],
  region: "大陆",
  description: "负责 AI 产品规划，需要数据分析能力",
  requirements: "硕士及以上",
  salary: "25-40K",
  deadline: "2026-09-30",
  postedAt: null,
  firstSeen: "2026-06-01T00:00:00.000Z",
  lastSeen: "2026-06-08T00:00:00.000Z",
  applyUrl: "https://jobs.bytedance.com/campus",
  detailUrl: null,
  tags: ["大厂", "AI"],
  scores: { urgency: 0.5, freshness: 0.8, tier: 1, base: 0.7, aiMatch: 0.8 },
  aiTags: {
    skills: ["Python", "数据分析", "产品设计", "用户研究", "AI"],
    roleType: "产品",
    industry: "互联网",
    seniority: "应届",
    summary: "适合 AI 背景的产品经理候选人",
  },
};

describe("computeProfileMatchDetailed", () => {
  test("空画像返回 0 分", () => {
    const prefs: Prefs = { categories: [], jobTypes: [], cities: [] };
    const result = computeProfileMatchDetailed(mockJob, prefs);
    expect(result.score).toBe(0);
    expect(result.reasons).toHaveLength(0);
  });

  test("技能匹配", () => {
    const prefs: Prefs = {
      categories: [],
      jobTypes: [],
      cities: [],
      skills: ["Python", "数据分析", "AI"],
    };
    const result = computeProfileMatchDetailed(mockJob, prefs);
    expect(result.score).toBeGreaterThan(0.2);
    expect(result.reasons.some((r) => r.includes("技能"))).toBe(true);
  });

  test("目标岗位匹配", () => {
    const prefs: Prefs = {
      categories: [],
      jobTypes: [],
      cities: [],
      targetRoles: ["产品经理"],
    };
    const result = computeProfileMatchDetailed(mockJob, prefs);
    expect(result.score).toBeGreaterThan(0.2);
    expect(result.reasons.some((r) => r.includes("岗位方向"))).toBe(true);
  });

  test("行业匹配", () => {
    const prefs: Prefs = {
      categories: ["互联网"],
      jobTypes: [],
      cities: [],
    };
    const result = computeProfileMatchDetailed(mockJob, prefs);
    expect(result.score).toBeGreaterThan(0.1);
    expect(result.reasons.some((r) => r.includes("行业"))).toBe(true);
  });

  test("城市匹配（需搭配其他维度）", () => {
    const prefs: Prefs = {
      categories: ["互联网"],
      jobTypes: [],
      cities: ["北京"],
    };
    const result = computeProfileMatchDetailed(mockJob, prefs);
    expect(result.score).toBeGreaterThan(0.1);
    expect(result.reasons.some((r) => r.includes("城市") || r.includes("行业"))).toBe(true);
  });

  test("全画像高匹配", () => {
    const prefs: Prefs = {
      categories: ["互联网"],
      jobTypes: ["秋招"],
      cities: ["北京"],
      skills: ["Python", "数据分析", "AI", "产品设计"],
      targetRoles: ["产品经理", "AI产品"],
    };
    const result = computeProfileMatchDetailed(mockJob, prefs);
    expect(result.score).toBeGreaterThan(0.6);
    expect(result.reasons.length).toBeGreaterThanOrEqual(3);
  });

  test("完全不匹配", () => {
    const prefs: Prefs = {
      categories: ["金融"],
      jobTypes: [],
      cities: ["成都"],
      skills: ["Java", "Spring"],
      targetRoles: ["后端工程师"],
    };
    const result = computeProfileMatchDetailed(mockJob, prefs);
    expect(result.score).toBeLessThan(0.3);
  });
});
