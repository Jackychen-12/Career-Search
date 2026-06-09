<div align="center">

# Career Search

**AI 驱动的全链路求职助手**

从简历解析到 Offer 对比，一站式解决 27 届应届生求职全流程。

[![在线访问](https://img.shields.io/badge/在线体验-career--search-2ea44f?style=for-the-badge)](https://career-search-ten.vercel.app/)

[![Next.js](https://img.shields.io/badge/Next.js_14-black?logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![DeepSeek](https://img.shields.io/badge/DeepSeek_AI-blue)](https://deepseek.com/)
[![Vercel](https://img.shields.io/badge/Vercel-black?logo=vercel)](https://vercel.com/)
[![Cloudflare](https://img.shields.io/badge/CF_Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)

</div>

---

## 这是什么

Career Search 不是一个岗位列表网站——它是一个 **AI 求职 SaaS**，覆盖求职的每一步：

```
上传简历 → AI 解析画像 → 智能匹配 1000+ 岗位 → 求职报告 → AI 面试/简历/求职信 → 投递追踪 → 每日邮件推送
```

## 核心功能

### 🎯 智能岗位匹配
- 1161 个岗位，每日自动抓取更新
- DeepSeek AI 对每个岗位提取结构化标签（技能/方向/行业）
- 基于你的画像实时计算匹配度 + 匹配理由
- 多选筛选、日历视图、岗位对比

### 🤖 AI 求职工具（DeepSeek 驱动）
| 工具 | 说明 |
|------|------|
| 简历解析 | 上传 PDF，AI 自动提取学校/技能/目标岗位 |
| 面试题定制 | 根据你的背景 × 目标 JD 生成 8-10 道针对性面试题 |
| 简历润色 | 逐条分析经历，STAR 法则优化，给出评分 |
| 求职信生成 | 根据岗位 JD 生成 400-600 字定制求职信 |
| Offer 对比 | 多个 Offer 多维度分析 + 推荐 + 谈薪建议 |

### 📊 求职报告
- 匹配度分布（高/中/低/无关联）
- Top 10 推荐岗位 + 匹配理由
- 技能缺口分析（你有的 vs 市场需求）
- 简历优化建议
- 面试题预测
- 投递策略（紧急优先）

### 📋 投递管理
- 8 种状态流转：收藏 → 已投 → 笔试 → 面试 → HR面 → Offer / 已拒 / 放弃
- 三种视图：表格（飞书式）/ 时间线 / 看板（Trello式）
- 优先级、渠道、联系人、薪资、备注
- 导出 Excel

### 📅 其他功能
- 本周投递清单（AI 推荐，按紧急度排序）
- 宣讲活动 + 微信公众号文章聚合
- 岗位详情页（一键生成面试题/求职信）
- 每日邮件推送（个性化匹配新增岗位）
- 暗色模式 + 移动端适配

## 技术架构

```
┌──────────────────────────────────────────────────────────┐
│                      用户浏览器                            │
│                                                          │
│   8 个页面 · 客户端匹配引擎 · 暗色模式 · 响应式            │
└────────────────────────────┬─────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌────────────────┐
│   Vercel     │    │   Supabase   │    │  CF Workers    │
│              │    │              │    │                │
│  Next.js 14  │    │  Auth        │    │  5 AI 端点:    │
│  SSG + SSR   │    │  PostgreSQL  │    │  简历解析       │
│  1161 静态页  │    │  RLS 安全    │    │  面试题        │
│              │    │              │    │  简历润色       │
│              │    │  profiles    │    │  求职信        │
│              │    │  tracking    │    │  Offer 对比    │
│              │    │  job_stats   │    │                │
└──────────────┘    └──────────────┘    └───────┬────────┘
                                                │
                                        ┌───────▼────────┐
                                        │  DeepSeek API  │
                                        │  deepseek-chat │
                                        └────────────────┘
         ▲
         │ 每日自动
┌────────┴─────────────────────────────────┐
│          GitHub Actions                   │
│                                          │
│  Crawl (6源) → AI 标签 → 邮件推送 → Deploy │
└──────────────────────────────────────────┘
```

### 技术选型

| 层 | 技术 | 为什么选它 |
|---|------|-----------|
| 前端 | Next.js 14 + Tailwind | SSG 性能 + Tailwind 开发效率 |
| 认证 | Supabase Auth | 零成本 + GitHub OAuth 开箱即用 |
| 数据库 | Supabase PostgreSQL | 免费 + RLS 行级安全 + Realtime |
| AI | DeepSeek API | 中文能力强 + 便宜（¥1/百万 token） |
| Serverless | Cloudflare Workers | 全球边缘 + 冷启动 0ms + 免费额度大 |
| 部署 | Vercel | Next.js 原生支持 + 自动 CI/CD |
| 邮件 | Resend | 开发者友好 + 免费 100 封/天 |
| 数据管道 | GitHub Actions | 免费 + 定时任务 + 零运维 |

### AI 匹配架构

```
构建时（离线）                    运行时（在线）
┌─────────────┐               ┌──────────────┐
│ DeepSeek    │               │ 用户画像      │
│ 提取每个岗位: │               │ 技能/目标/行业│
│ • skills    │               │ 城市/学历     │
│ • roleType  │   jobs.json   └──────┬───────┘
│ • industry  │ ──────────→         │
│ • summary   │               匹配引擎（浏览器）
└─────────────┘               │
                              ▼
                    匹配度 85% + 理由
                    "技能匹配: Python
                     岗位方向: 产品经理"
```

## 数据规模

| 指标 | 数值 |
|------|------|
| 岗位总数 | 1,161 |
| AI 标签覆盖率 | 100% |
| 岗位详情页 | 1,161 |
| 宣讲活动 | 16 |
| 公众号文章 | 40 |
| AI Skill 端点 | 5 |
| 页面路由 | 8 |
| 数据源 | 6（Greenhouse / Lever / Ashby / 社区仓库 / Seed / 搜狗微信）|

## 页面

| 路由 | 功能 |
|------|------|
| `/` | 首页（岗位列表 + 筛选 + 侧边栏） |
| `/job/[id]` | 岗位详情（AI 分析 + 面试题/求职信生成） |
| `/profile` | 画像设置（上传简历 → AI 解析 → 完善 → 匹配预览） |
| `/report` | 求职报告（匹配分布 / Top10 / 技能缺口 / 简历建议） |
| `/skills` | AI 工具（面试题 / 简历润色 / 求职信 / Offer 对比） |
| `/timeline` | 投递管理（表格 / 时间线 / 看板三视图） |
| `/events` | 宣讲活动 + 公众号推送 |
| `/callback` | OAuth 回调 |

## 本地开发

```bash
git clone https://github.com/Jackychen-12/Career-Search.git
cd Career-Search
npm install
npm run crawl    # 抓取岗位 + AI 标签（需要 DEEPSEEK_API_KEY）
npm run dev      # http://localhost:3000
```

## 部署

项目已部署在 Vercel，每日 GitHub Actions 自动更新数据。

需要配置的 Secrets：
- `DEEPSEEK_API_KEY` — AI 标签 + Skill 端点
- `SUPABASE_SERVICE_KEY` — Actions 读用户数据
- `RESEND_API_KEY` — 邮件推送

## 作者

**Jacky Chen** · AI Product Manager

- GitHub: [@Jackychen-12](https://github.com/Jackychen-12)
- 邮箱: cky1148589861@163.com

## License

MIT
