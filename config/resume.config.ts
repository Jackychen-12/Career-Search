// Your resume keywords — used at build time to compute an AI match score for each job.
// Edit these to match YOUR skills and target roles. More specific = better matches.

export const RESUME_KEYWORDS = {
  skills: [
    "AI", "人工智能", "大模型", "LLM", "NLP", "机器学习", "AIGC",
    "产品经理", "产品设计", "用户研究", "需求分析",
    "数据分析", "数据驱动", "AB测试", "SQL",
    "Python", "JavaScript", "TypeScript",
    "搜索", "推荐", "策略",
    "金融", "投行", "资管", "风控", "量化",
    "管培", "管理培训生", "领导力",
  ],
  targetRoles: [
    "产品经理", "AI产品", "策略产品", "数据产品",
    "产品运营", "商业分析",
    "管培生", "管理培训生", "管培",
    "金融科技", "投资", "研究员", "分析师",
    "AI PM", "Product Manager", "Strategy",
  ],
  targetCompanyTiers: [1, 2] as number[],
  targetCategories: ["互联网", "金融", "管培"] as string[],
};
