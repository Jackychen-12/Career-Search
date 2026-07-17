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
    expect(result.score).toBeGreaterThan(0.15);
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

  test("短 ASCII token 不误匹配（AI 不命中 training/email 等）", () => {
    const jobWithEmail: Job = {
      ...mockJob,
      id: "test-boundary",
      company: "Acme Corp",
      title: "Marketing Manager",
      description: "responsible for email marketing and training programs",
      category: "其他" as any,
      tags: [],
      aiTags: undefined,
    };
    const prefs: Prefs = {
      categories: [],
      jobTypes: [],
      cities: [],
      skills: ["AI"],
    };
    const result = computeProfileMatchDetailed(jobWithEmail, prefs);
    expect(result.score).toBe(0);
  });

  test("短 ASCII token 正确命中独立出现的 AI", () => {
    const prefs: Prefs = {
      categories: [],
      jobTypes: [],
      cities: [],
      skills: ["AI"],
    };
    const result = computeProfileMatchDetailed(mockJob, prefs);
    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons.some((r) => r.includes("技能"))).toBe(true);
  });

  test("中文 token 仍然使用 includes 匹配", () => {
    const prefs: Prefs = {
      categories: [],
      jobTypes: [],
      cities: [],
      skills: ["数据分析"],
    };
    const result = computeProfileMatchDetailed(mockJob, prefs);
    expect(result.score).toBeGreaterThan(0);
  });

  // --- New enrichment tests ---

  test("无 aiTags 的字节跳动岗位通过公司知识库获得高匹配", () => {
    const jobNoTags: Job = {
      ...mockJob,
      id: "test-enrich",
      title: "27届秋招正式批",
      description: "",
      tags: ["大厂", "已开放"],
      aiTags: undefined,
    };
    const prefs: Prefs = {
      categories: ["互联网"],
      jobTypes: [],
      cities: ["北京"],
      skills: ["AI", "Python", "数据分析"],
      targetRoles: ["产品经理"],
    };
    const result = computeProfileMatchDetailed(jobNoTags, prefs);
    expect(result.score).toBeGreaterThan(0.5);
  });

  test("同义词匹配：用户 机器学习 vs 英文标题 Machine Learning", () => {
    const mlJob: Job = {
      ...mockJob,
      id: "test-synonym",
      company: "Acme Corp",
      title: "Machine Learning Engineer Intern",
      description: "",
      category: "外企" as any,
      tags: [],
      aiTags: undefined,
    };
    const prefs: Prefs = {
      categories: [],
      jobTypes: [],
      cities: [],
      skills: ["机器学习"],
    };
    const result = computeProfileMatchDetailed(mlJob, prefs);
    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons.some((r) => r.includes("技能"))).toBe(true);
  });

  test("graduated role: 公司推断的角色获得部分分数", () => {
    const genericJob: Job = {
      ...mockJob,
      id: "test-graduated-role",
      company: "百度",
      title: "2027届秋招",
      description: "",
      tags: ["大厂", "AI"],
      aiTags: undefined,
    };
    const prefs: Prefs = {
      categories: [],
      jobTypes: [],
      cities: [],
      targetRoles: ["产品经理"],
    };
    const result = computeProfileMatchDetailed(genericJob, prefs);
    expect(result.score).toBeGreaterThan(0.05);
    expect(result.reasons.some((r) => r.includes("岗位方向"))).toBe(true);
  });

  test("有 aiTags 时优先使用 aiTags 而非富化", () => {
    const prefs: Prefs = {
      categories: ["互联网"],
      jobTypes: [],
      cities: ["北京"],
      skills: ["Python", "数据分析"],
      targetRoles: ["产品经理"],
    };
    const result = computeProfileMatchDetailed(mockJob, prefs);
    expect(result.score).toBeGreaterThan(0.5);
  });

  test("company relevance: 公司领域与用户技能重叠", () => {
    const baiduJob: Job = {
      ...mockJob,
      id: "test-company-rel",
      company: "百度",
      title: "2027届秋招",
      description: "",
      tags: [],
      aiTags: undefined,
    };
    const prefs: Prefs = {
      categories: [],
      jobTypes: [],
      cities: [],
      skills: ["AI", "NLP", "Python", "大模型"],
    };
    const result = computeProfileMatchDetailed(baiduJob, prefs);
    expect(result.reasons.some((r) => r.includes("公司相关"))).toBe(true);
  });
});
