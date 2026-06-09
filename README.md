<div align="center">

# Career Search

**AI 驱动的 27 届求职助手 — 岗位聚合 · 画像匹配 · AI 工具 · 投递追踪 · 邮件推送**

[![在线访问](https://img.shields.io/badge/在线访问-Live-2ea44f?style=for-the-badge)](https://career-search-ten.vercel.app/)
[![Stars](https://img.shields.io/github/stars/Jackychen-12/Career-Search?style=flat&logo=github)](https://github.com/Jackychen-12/Career-Search/stargazers)
[![Deploy](https://img.shields.io/github/actions/workflow/status/Jackychen-12/Career-Search/deploy.yml?logo=githubactions&logoColor=white&label=daily%20crawl)](https://github.com/Jackychen-12/Career-Search/actions)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3ECF8E?logo=supabase)](https://supabase.com/)
[![DeepSeek](https://img.shields.io/badge/DeepSeek-AI-blue)](https://deepseek.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)](https://vercel.com/)

</div>

---

## 产品概述

Career Search 是一个面向 27 届应届生的 **AI 求职助手 SaaS**。不只是信息聚合站——从简历解析到 Offer 对比，覆盖求职全链路。

**核心链路**：登录 → 上传简历/建立画像 → AI 匹配岗位 → 求职报告 → AI 面试/求职信 → 投递追踪 → 邮件推送

## 功能矩阵

| 模块 | 功能 | 说明 |
|------|------|------|
| **岗位聚合** | 1161 岗位 / 每日自动更新 | 多源爬取：社区仓库 + ATS API + 手工 seed |
| **AI 画像解析** | 上传 PDF / 粘贴文本 | DeepSeek 自动提取学校/技能/目标岗位 |
| **AI 匹配排序** | 构建时标签 + 客户端实时匹配 | 不同用户不同匹配结果 |
| **岗位详情页** | 完整 JD + AI 分析 + 技能高亮 | 一键生成面试题/求职信 |
| **AI 求职工具** | 面试题 / 简历润色 / 求职信 / Offer 对比 | 4 个 DeepSeek skill 端点 |
| **求职报告** | 匹配分布 / Top10 / 技能缺口 / 面试题 | 可导出 PDF |
| **投递追踪** | 8 种状态 / 优先级 / 备注 | 飞书多维表格式，导出 Excel |
| **投递清单** | 基于画像推荐本周该投的岗位 | 按紧急度排序，国内优先 |
| **岗位对比** | 勾选 2-3 个横向对比 | 技能匹配高亮 + AI 推荐 |
| **求职时间线** | 甘特图式进度条 + 时间轴 | 可视化全部投递进度 |
| **宣讲活动** | 搜狗微信爬取 + 公众号推送 | 搜索 + 来源/类型筛选 |
| **邮件推送** | 每日新增匹配岗位推送 | 个性化匹配，Resend 发送 |
| **暗色模式** | 手动切换 | localStorage 持久化 |
| **移动端** | 汉堡菜单 + 响应式 | 全页面适配 |

## 系统架构

```
┌──────────────────────────────────────────────────────────────┐
│                        用户浏览器                              │
│                                                              │
│  ┌─────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐ │
│  │首页/筛选 │ │岗位详情 │ │AI 工具  │ │求职报告 │ │投递/时间线│ │
│  └────┬────┘ └────┬───┘ └───┬────┘ └───┬────┘ └─────┬────┘ │
│       └───────────┴─────────┴───────────┴────────────┘      │
│                            │                                 │
│              客户端匹配引擎 (画像 × aiTags)                     │
└──────────────────────────────┼───────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
  │    Vercel    │   │   Supabase   │   │ Cloudflare Worker│
  │  SSG/SSR    │   │  Auth + DB   │   │   DeepSeek 代理  │
  │  8个页面     │   │  profiles    │   │ 5个 AI 端点:     │
  │  1161岗位详情│   │  tracking    │   │  resume/parse    │
  │             │   │  job_stats   │   │  skill/interview │
  │             │   │             │   │  skill/resume    │
  │             │   │             │   │  skill/cover     │
  │             │   │             │   │  skill/offer     │
  └──────────────┘   └──────────────┘   └──────────────────┘
           ▲
           │
  ┌──────────────────────────────────────────┐
  │      GitHub Actions (每日自动)             │
  │                                          │
  │  爬虫 → DeepSeek AI 标签 → 邮件推送 → 部署 │
  └──────────────────────────────────────────┘
```

## 技术栈

| 层 | 技术 | 用途 |
|---|------|------|
| 前端 | Next.js 14 + Tailwind CSS | 8 个页面，SSG + 客户端交互 |
| 认证 | Supabase Auth (GitHub OAuth) | 用户登录 |
| 数据库 | Supabase PostgreSQL + RLS | 画像/投递/统计，行级安全 |
| AI | DeepSeek Chat API | 标签提取 + 简历解析 + 4 个 skill |
| Serverless | Cloudflare Workers | AI API 代理（5 个端点） |
| 部署 | Vercel + GitHub Actions | 自动部署 + 每日数据刷新 |
| 邮件 | Resend API | 每日岗位推送 |
| 数据源 | Greenhouse/Lever/Ashby + 社区仓库 + 搜狗微信 | 岗位 + 宣讲 + 文章 |

## AI 匹配架构

**离线（构建时 GitHub Actions）**：
- DeepSeek 对每个岗位提取结构化标签：skills / roleType / industry / seniority / summary
- 1161 个岗位 100% AI 标签覆盖

**在线（浏览器端）**：
- 用户画像（技能/目标岗位/行业/城市）× 岗位 aiTags → 实时匹配分
- 权重：技能 40% + 岗位方向 30% + 行业 15% + 城市 15%
- 不同用户、不同画像 → 不同排序结果

## 数据库设计

```sql
profiles    -- 用户画像（学校/技能/目标/邮箱推送设置）
tracking    -- 投递追踪（8种状态/优先级/日期/渠道/备注）
job_stats   -- 岗位统计（收藏/投递计数）
```

全部启用 RLS（Row Level Security），用户只能读写自己的数据。

## 页面结构

```
/              首页（岗位列表 + 多选筛选 + 侧边栏）
/job/[id]      岗位详情（AI分析 + 面试题/求职信生成）
/profile       画像设置（上传简历 → 完善画像 → 匹配预览）
/report        求职报告（匹配分布/Top10/技能缺口/面试题/简历建议）
/skills        AI 工具（面试题/简历润色/求职信/Offer对比）
/timeline      求职时间线（甘特图 + 事件流）
/events        宣讲活动 + 公众号推送（搜索+筛选）
/callback      OAuth 回调
```

## 本地开发

```bash
git clone https://github.com/Jackychen-12/Career-Search.git
cd Career-Search
npm install
npm run crawl                    # 抓取岗位 + AI 标签
npm run dev                      # http://localhost:3000
```

## 环境变量 / Secrets

| 变量 | 位置 | 用途 |
|------|------|------|
| `DEEPSEEK_API_KEY` | GitHub Secrets + Worker | AI 标签 + 简历解析 + Skill |
| `SUPABASE_SERVICE_KEY` | GitHub Secrets | Actions 读用户画像发邮件 |
| `RESEND_API_KEY` | GitHub Secrets | 邮件发送 |
| `NEXT_PUBLIC_SUPABASE_URL` | 代码 | Supabase 连接 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 代码 | Supabase 公开 key |

## 数据规模

| 指标 | 数值 |
|------|------|
| 总岗位数 | 1,161 |
| AI 标签覆盖 | 100% |
| 宣讲活动 | 16 |
| 公众号文章 | 40 |
| 岗位详情页 | 1,161 |
| AI Skill 端点 | 5 |

## License

MIT
