<div align="center">

# Career Search

**AI 驱动的 27 届求职助手 —— 岗位聚合 · 画像匹配 · 投递追踪 · 求职报告**

[![在线访问](https://img.shields.io/badge/在线访问-Live-2ea44f?style=for-the-badge)](https://jackychen-12.github.io/Career-Search/)
[![Stars](https://img.shields.io/github/stars/Jackychen-12/Career-Search?style=flat&logo=github)](https://github.com/Jackychen-12/Career-Search/stargazers)
[![Deploy](https://img.shields.io/github/actions/workflow/status/Jackychen-12/Career-Search/deploy.yml?logo=githubactions&logoColor=white&label=daily%20deploy)](https://github.com/Jackychen-12/Career-Search/actions)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3ECF8E?logo=supabase)](https://supabase.com/)
[![DeepSeek](https://img.shields.io/badge/DeepSeek-AI-blue)](https://deepseek.com/)

</div>

---

## 产品概述

Career Search 是一个面向 27 届应届生的 **AI 求职助手**，不只是信息聚合站。

核心链路：**登录 → 上传简历/建立画像 → AI 解析匹配 → 查看求职报告 → 投递追踪**

| 功能 | 说明 |
|------|------|
| **岗位聚合** | 1000+ 岗位，每日自动抓取（社区仓库 + ATS API + seed） |
| **AI 画像解析** | 上传 PDF 简历，DeepSeek 自动提取学校/技能/目标岗位 |
| **AI 匹配排序** | 构建时 AI 提取岗位标签，客户端基于画像实时计算匹配度 |
| **求职报告** | 匹配分布 / Top10 推荐 / 技能缺口 / 面试题预测 / 简历优化建议 |
| **投递追踪** | 8 种状态流转 + 优先级/渠道/备注 + 导出 Excel |
| **投递清单** | 基于画像自动推荐本周该投的岗位，按紧急度排序 |
| **岗位对比** | 勾选 2-3 个岗位横向对比，技能匹配高亮 |
| **宣讲活动** | 搜狗微信搜索 + 清华/北大就业网爬取 |
| **日历视图** | 按月查看截止日期 |

## 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                       用户浏览器                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ 首页/筛选 │  │ 画像设置  │  │ 求职报告  │  │ 投递追踪│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │             │             │              │      │
│  ┌────▼─────────────▼─────────────▼──────────────▼────┐ │
│  │              客户端匹配引擎 (matchScore.ts)          │ │
│  │         画像 × aiTags → 实时匹配度 + 理由            │ │
│  └────────────────────────┬───────────────────────────┘ │
└───────────────────────────┼─────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│ GitHub Pages │  │   Supabase   │  │ Cloudflare Worker│
│   静态资源    │  │  Auth + DB   │  │   AI 代理        │
│  jobs.json   │  │  profiles    │  │ /resume/parse    │
│  events.json │  │  tracking    │  │   → DeepSeek     │
│              │  │  job_stats   │  │                  │
└──────────────┘  └──────────────┘  └──────────────────┘
        ▲
        │
┌──────────────────────────────────────┐
│         GitHub Actions (每日)         │
│  ┌─────────┐  ┌──────────┐  ┌─────┐ │
│  │ 爬虫引擎 │→│ DeepSeek │→│ 构建 │ │
│  │Greenhouse│  │ AI 标签   │  │ 部署 │ │
│  │Lever/社区│  │ 提取     │  │     │ │
│  │Seed/搜狗 │  │          │  │     │ │
│  └─────────┘  └──────────┘  └─────┘ │
└──────────────────────────────────────┘
```

## 技术栈

| 层 | 技术 | 用途 |
|---|------|------|
| 前端 | Next.js 14 + Tailwind CSS | 页面渲染 + 静态导出 |
| 认证 | Supabase Auth (GitHub OAuth) | 用户登录注册 |
| 数据库 | Supabase PostgreSQL | 画像/投递/统计云端存储 |
| AI | DeepSeek API | 简历解析 + 岗位标签提取 |
| Serverless | Cloudflare Workers | AI 代理 + OAuth 中转 |
| 部署 | GitHub Pages + Actions | 静态托管 + 每日 CI/CD |
| 数据源 | Greenhouse/Lever/Ashby API + 社区仓库 + 搜狗微信 | 岗位 + 宣讲会 |

## AI 匹配架构

匹配分为**离线**和**在线**两层：

**离线（构建时）**：GitHub Actions 调 DeepSeek，对每个岗位提取结构化标签：
```json
{
  "skills": ["Python", "数据分析", "用户研究"],
  "roleType": "产品",
  "industry": "互联网",
  "seniority": "应届",
  "summary": "适合产品经理背景的应届生"
}
```

**在线（浏览器）**：用户设置画像后，客户端实时计算匹配度：
- 技能匹配（40%）：用户技能 × 岗位所需技能
- 岗位方向（30%）：目标岗位 × roleType
- 行业匹配（15%）：意向行业 × industry
- 城市匹配（15%）：意向城市 × location

不同用户、不同画像 → 不同匹配结果。

## 数据库设计

```
profiles (用户画像)
├── id (FK → auth.users)
├── school / major / degree
├── skills[] / target_roles[]
├── categories[] / cities[]
└── RLS: 只能读写自己的

tracking (投递追踪)
├── user_id (FK → auth.users)
├── job_id / status / priority
├── applied_at / interview_at / offer_at
├── channel / contact / salary / notes
└── RLS: 只能读写自己的

job_stats (岗位统计)
├── job_id
├── save_count / apply_count / view_count
└── RLS: 所有人可读，登录用户可写
```

## 数据管道

每日 GitHub Actions 自动执行：

1. **爬取** — 并行抓取 6 类数据源（seed + Greenhouse + Lever + Ashby + 社区仓库 + 官网）
2. **去重** — 按 company + title + location 生成唯一 ID，合并多源信息
3. **AI 标签** — DeepSeek 批量提取每个岗位的结构化属性
4. **宣讲会** — 搜狗微信搜索爬取校园招聘文章
5. **构建** — Next.js 静态导出，数据内嵌进页面
6. **部署** — 发布到 GitHub Pages
7. **通知** — 检测新增岗位，可选邮件推送

## 本地开发

```bash
git clone https://github.com/Jackychen-12/Career-Search.git
cd Career-Search
npm install
npm run crawl    # 抓取岗位数据
npm run dev      # 启动开发服务器 http://localhost:3000
```

## 环境变量

| 变量 | 位置 | 用途 |
|------|------|------|
| `DEEPSEEK_API_KEY` | GitHub Secrets + Worker Secrets | AI 标签提取 + 简历解析 |
| `NEXT_PUBLIC_SUPABASE_URL` | 代码硬编码 | Supabase 项目地址 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 代码硬编码 | Supabase 公开 key |

## 页面结构

```
/                 首页（岗位列表 + 筛选 + 侧边栏）
/profile          画像设置（三步流程：上传简历 → 完善画像 → 查看匹配）
/report           求职报告（匹配分布 / Top10 / 技能缺口 / 面试题 / 简历建议）
/events           宣讲活动（搜索 + 来源/类型筛选）
/callback         OAuth 回调
```

## License

MIT

