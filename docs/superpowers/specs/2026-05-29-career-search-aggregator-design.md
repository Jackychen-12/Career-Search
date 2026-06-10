# Career-Search 求职信息聚合平台 · 设计文档

- 日期：2026-05-29
- 仓库：`keyuchen-del/Career-Search`（在现有仓库上扩展，最终部署到 GitHub Pages）
- 状态：设计已与用户确认，待 spec 评审 → writing-plans

---

## 1. 背景与目标

现状：
- `Summer-Intern`（github.com/keyuchen-del/Summer-Intern）是单个 `index.html`，内嵌 20 条硬编码实习数据，纯展示。
- `Career-Search`（桌面，github.com/keyuchen-del/Career-Search）是 Vite + React + TS 的重写版，已接好 Actions→Pages，但数据仍硬编码在 `src/data/internships.ts`。

目标：把它升级成一个**可复用的"暑期 + 秋招"求职信息聚合站**，具备：
1. 自动数据采集（网页爬取 / 公共 API / 开源仓库）；
2. 信息提取与归一化（统一 schema）；
3. 按需筛选（行业 / 城市 / 类型 / 关键词 / 临近截止）；
4. 重点排序（截止紧迫度 + 新鲜度 + 公司层级 + 个人方向匹配）；
5. 点击直达官方投递页；
6. 可被他人直接使用（访问站点；或 fork 改配置跑出自己的一份）；
7. 推到 GitHub，自动部署。

**关键基座决策**：对齐用户已上线的同类项目 **AI-Search**（github.com/keyuchen-del/AI-Search，Next.js 14 静态导出 + 每日 cron 爬取 + GitHub Pages），最大化复用其已验证的工作流、子路径处理、"加源=加一行"模式、失败隔离的爬虫编排。本项目 = AI-Search 模板 + 求职领域模型 + 求职数据源 + 排序/个性化。

---

## 2. 范围

### In scope
- 四个覆盖方向：国内互联网/科技、金融（券商/投行/四大）、外企 & 海外科技、快消/管培/实体。
- 数据类型：暑期实习、秋招（校招全职）、日常实习、校招。
- 静态站点 + GitHub Actions 定时爬取（零后端、零成本、fork 即用）。
- 轻量个性化：浏览器 localStorage 存方向/岗位/城市偏好，用于筛选与匹配加权（无账号、无登录、不解析简历）。
- 更新频率：每天一次（cron）+ push + 手动触发。

### Out of scope（本期不做）
- 用户账号体系、服务端、数据库。
- 简历解析 / 一键代投 / 内推对接。
- 实时（分钟级）抓取。
- 登录态/强反爬站点的实时爬取（实习僧/牛客/BOSS 等不做实时爬取——见 §6 边界）。

---

## 3. 总体架构

```
GitHub Actions（每天 cron + push + 手动）
  ├─ npm run crawl            # Node+TS，跑在 CI
  │   ├─ scripts/sources/*    # 每个数据源一个 adapter
  │   ├─ Promise.allSettled   # 单源失败不影响整体（失败隔离）
  │   ├─ 归一化 → 去重 → firstSeen diff → 打分 → 排序
  │   └─ 写 data/jobs.json + data/meta.json
  ├─ git commit 快照（best-effort，[skip ci]）
  └─ next build（output:'export'，DATA_SOURCE=local，
                 NEXT_PUBLIC_BASE_PATH=/Career-Search）
      └─ 构建时读 data/jobs.json，内嵌进预渲染首页
          └─ deploy → https://career.chenkeyu12.com/

浏览器（纯静态，无运行时数据请求）
  └─ 对内嵌数据集做 筛选 / 搜索 / 分页 / 个性化匹配重排 / 跳转
     偏好存 localStorage
```

数据在**构建时**读入并内嵌进预渲染页面（与 AI-Search 一致），运行时不再请求数据接口。

---

## 4. 技术栈

| 技术 | 用途 | 与 AI-Search 关系 |
|------|------|------|
| Next.js 14（`output:'export'`） | 静态站点 | 一致 |
| React 18 + TypeScript | UI | 一致（迁移现有 Career-Search 组件） |
| Tailwind CSS | 样式 | 一致（AI-Search 用 Tailwind；现有 Career-Search 用 global.css，迁移时统一到 Tailwind） |
| `tsx` | 跑爬虫脚本 | 一致 |
| `fast-xml-parser` | 解析 RSS/XML（若用到 RSS 源） | 一致 |
| GitHub Actions → Pages | CI/CD | 一致（镜像 deploy.yml） |

**框架迁移说明**：现有 Career-Search 是 Vite。本期迁移到 Next.js 14 以对齐 AI-Search。现有 React 组件（`InternshipCard`/`FilterBar`/`StatCard`/`ErrorBoundary` 等）可移植；`PhoneFrame` landing 展示形态可保留或简化；`src/data/internships.ts` 的 20 条数据转为种子源 `scripts/sources/seed.ts`。

---

## 5. 数据模型

`lib/types.ts`：

```ts
export type JobType = '暑期实习' | '秋招' | '日常实习' | '校招';
export type Region = '大陆' | '香港' | '海外';
export type Category = '互联网' | '金融' | '外企' | '快消' | '实体' | '管培' | '其他';

export interface Job {
  id: string;              // 稳定哈希：normalize(company)+normalize(title)+primaryLocation
  origin: string;          // 产出它的 adapter，如 'greenhouse' | 'official:bytedance' | 'repo:xxx' | 'seed'
  company: string;
  companyTier: number;     // 1=头部/大厂 2=知名 3=其他（来自 config，默认 2）
  title: string;
  category: Category;
  jobType: JobType;
  location: string[];      // 城市数组（归一化）
  region: Region;
  description: string | null;
  requirements: string | null;
  salary: string | null;
  deadline: string | null; // ISO date，可空
  postedAt: string | null; // 源声明的发布时间，可空
  firstSeen: string;       // 本系统首次发现（ISO）——靠快照 diff 得出
  lastSeen: string;        // 最近一次出现（ISO）
  applyUrl: string;        // 投递/详情直达链接（点击跳转）
  detailUrl: string | null;
  tags: string[];
  scores: {                // 构建时预计算（用户无关）
    urgency: number;       // 0–1
    freshness: number;     // 0–1
    tier: number;          // 0–1
    base: number;          // 加权合成（不含个人匹配）
  };
}
```

`data/meta.json`：`{ fetchedAt, count, sources: {id: number}, errors: {id: string} }`。

---

## 6. 数据源（分层）与 adapter 设计

### Adapter 接口（镜像 AI-Search `scripts/sources/types.ts`）

```ts
export interface SourceAdapter {
  id: string;                       // 'greenhouse' | 'lever' | 'official:bytedance' | 'repo:xxx' | 'seed'
  label: string;
  fetch(): Promise<Job[]>;          // 抛错只影响本源
}
```

### Tier A —— 可靠打底（必做）

1. **ATS 公共 API**（清洁 JSON、合法、CI 友好）：
   - Greenhouse：`https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true`
   - Lever：`https://api.lever.co/v0/postings/{company}?mode=json`
   - Ashby：`https://api.ashbyhq.com/posting-api/job-board/{org}`
   - 一个 adapter 对应一个 provider，内部遍历 `config/companies.config.ts` 里属于该 provider 的公司列表。**加一家公司 = 配置里加一行**。
2. **开源校招/实习仓库**：抓取 GitHub 上社区维护的结构化清单（markdown 表格 / issues / json）的 raw 内容并解析。具体仓库在实现阶段挑选并验证（确认存在、结构可解析、更新活跃），写进 `config/sources.config.ts`。用 `GITHUB_TOKEN` 提高限额。
3. **种子清单 `scripts/sources/seed.ts`**：迁移现有 20 条手维护数据（含官网链接），保证国内大厂始终有基础条目，作为兜底。

### Tier B —— 尽力而为（可选，逐个适配）

4. **国内大厂官网 career 接口**：能直接打 JSON 的先适配几个（如字节 `jobs.bytedance.com` 的搜索接口）。**失效自动跳过**并在 `meta.json.errors` 标记，不影响整体。注意：CI 数据中心 IP 可能被封（已被 AI-Search 的 Reddit RSS 403 印证），所以这层视为增量、不保证。

### 配置分离（复用核心）

`config/` 目录，forker 只改这里即可定制：
- `companies.config.ts`：`{ name, ats: 'greenhouse'|'lever'|'ashby', token, tier, category }[]`
- `sources.config.ts`：启用哪些源、开源仓库清单。
- `ranking.config.ts`：排序权重。

---

## 7. 数据管线

镜像 AI-Search `scripts/crawl.ts` + `scripts/lib/persist.ts`，针对求职增强 **firstSeen diff**。

`scripts/crawl.ts`（编排）：
1. 选择 adapters（支持 `--only=greenhouse,lever` 调试）。
2. `Promise.allSettled` 并行 fetch；逐源记 count / error。
3. `dedupeAndScore(loadPrevious(), allItems)` → 写快照。
4. 打印每源结果；`written===0` 时 `exitCode=1`（但 workflow 用 `|| echo` 兜底，仍以上次快照构建）。

`scripts/lib/persist.ts`：
- **load previous**：读上次 `data/jobs.json` → 建 `id → firstSeen` 映射。
- **dedupe**：按 `id` 去重；跨源同岗位合并，保留字段更全者。
- **firstSeen diff**：命中旧映射 → 沿用旧 `firstSeen`；否则 `firstSeen = now`。所有保留项 `lastSeen = now`。
- **过期处理**：`deadline < today` 的条目标记 expired 并从输出剔除（或保留但排末位——实现时定，默认剔除）。
- **写快照**：`data/jobs.json` + `data/meta.json`。

---

## 8. 排序与个性化

### 构建时打分（用户无关，写入 `scores`）

- `urgency`（截止紧迫度）：由 `daysLeft = deadline - today` 推算。无 deadline → 中性 0.5；`daysLeft<=0` → 剔除；`0<daysLeft<=7` → ≈1.0；线性衰减到 30 天的 ≈0.1。
- `freshness`（新鲜度）：由 `firstSeen` 年龄推算，`clamp(1 - ageDays/30, 0, 1)`。
- `tier`（公司层级）：`companyTier` 归一（1→1.0，2→0.7，3→0.4）。
- `base = w1·urgency + w2·freshness + w3·tier`，权重在 `ranking.config.ts`（默认 0.4 / 0.3 / 0.3，和为 1）。

### 客户端个性化（用户相关，`lib/ranking.ts`）

- 用户在偏好面板填：方向（category 多选）、岗位类型（jobType）、城市偏好。存 `localStorage`（镜像 AI-Search `lib/localStore.ts`）。
- `matchScore ∈ [0,1]`：category 命中 / jobType 命中 / 城市命中 / 关键词命中 的加权。
- `final = base + w4·matchScore`（`w4` 默认 0.5），客户端实时重排。
- 提供排序切换：综合（final）/ 最近截止（urgency）/ 最新发布（freshness）。

### 筛选与跳转

- 扩展现有 FilterBar：行业、城市、jobType（暑期/秋招/...）、region、"仅看临近截止"、关键词搜索、分页。
- 卡片点击 `applyUrl` / `detailUrl` 直达官方页（`target="_blank"`）。

---

## 9. 前端

镜像 AI-Search 的 server-prerender + client-interaction 结构：
- `app/page.tsx`（server）：构建时经 resolver 读 `data/jobs.json`，把数组传给 `HomeClient`。
- `components/HomeClient.tsx`（client）：持有数据集，做筛选/排序/匹配/分页。
- 组件：`FilterBar`、`JobCard`（由现有 `InternshipCard` 演化）、`StatCard`、`SortTabs`、`Pagination`、`SearchBar`、`PrefsPanel`（新增，编辑个人偏好）、`SourceStatusBanner`（新增，读 meta 显示"某来源今日未更新 / 上次更新时间"）、`ErrorBoundary`。
- `lib/`：`types.ts`、`filter.ts`、`ranking.ts`（客户端匹配）、`localStore.ts`、`config.ts`、`jobsData.ts`（数据解析/兜底 mock）。

---

## 10. 复用性（别人直接用）

- **直接访问**：部署的 Pages 站点，人人可看。
- **Fork 即用**：fork → 改 `config/`（公司列表 / ATS token / 排序权重 / 覆盖方向）→ 仓库自带 deploy workflow 自动跑出自己的一份。**配置与代码分离，不懂代码也能改。**
- **README**：写清「如何加一个 ATS 公司（加一行）」「如何加一个 adapter」「如何改排序权重」「本地 `npm run crawl` + `npm run dev` 验证」。

---

## 11. 构建与部署

镜像 AI-Search `.github/workflows/deploy.yml` 与 `next.config.mjs`：

- 触发：`push: [main]` + `schedule: cron "17 22 * * *"`（错峰分钟，约北京次日 06:17）+ `workflow_dispatch`。
- 权限：`contents:write`（提交快照）、`pages:write`、`id-token:write`。
- `concurrency: { group: pages, cancel-in-progress: false }`。
- 步骤：checkout@v4 → setup-node@v4（node 20，cache npm）→ `npm ci` → `npm run crawl`（带 `GITHUB_TOKEN`；`|| echo` 兜底）→ best-effort 提交 `data/jobs.json data/meta.json`（`[skip ci]`）→ configure-pages@v5（`enablement:true`）→ `npm run build`（`NEXT_PUBLIC_BASE_PATH=/Career-Search`，`DATA_SOURCE=local`）→ upload-pages-artifact@v3（`./out`）→ deploy-pages@v4。
- `next.config.mjs`：`output:'export'`、`trailingSlash:true`、`basePath/assetPrefix = NEXT_PUBLIC_BASE_PATH`、`images.unoptimized`。
- 本地验证静态产物需模拟子路径：把 `out/` 软链成 `Career-Search/` 再起静态服务器，否则 `/Career-Search/_next` 资源 404（AI-Search 已踩过的坑）。

---

## 12. 健壮性与错误处理

- 单源失败隔离（`Promise.allSettled`），错误写入 `meta.json.errors`。
- 种子源永远兜底：即使所有爬虫挂掉，站点仍有内容。
- crawl 失败时 workflow 以「上次 good 快照」继续构建，不让部署中断。
- 进前端前用 schema 校验（zod 或轻量手写守卫）过滤脏数据。
- `SourceStatusBanner` 向用户透明展示数据新鲜度与失败源。

---

## 13. 测试策略

- **adapter 单测**：用录制的样例响应（`scripts/fixtures/`）测归一逻辑，不依赖网络。
- **pipeline 单测**：去重、firstSeen diff、过期剔除、打分。
- **前端纯函数单测**：`filter.ts`、`ranking.ts`（matchScore、final 排序）。
- **CI**：PR 上只跑 lint + test + build（不跑真实爬取）；真实爬取仅在 schedule/dispatch。

---

## 14. 项目结构

```
Career-Search/
├─ app/                         # Next.js（迁移自 Vite）
│  ├─ layout.tsx  page.tsx  globals.css
├─ components/                  # 迁移现有 + 新增 PrefsPanel / SourceStatusBanner / SortTabs
├─ lib/
│  ├─ types.ts  filter.ts  ranking.ts  localStore.ts  config.ts  jobsData.ts
├─ scripts/                     # 爬虫（Node/TS）
│  ├─ crawl.ts
│  ├─ lib/{persist.ts,fetchUtil.ts}
│  ├─ sources/{types.ts,greenhouse.ts,lever.ts,ashby.ts,opensourceRepo.ts,official/*.ts,seed.ts}
│  └─ fixtures/                 # 测试样例
├─ config/                      # forker 改这里
│  ├─ companies.config.ts  sources.config.ts  ranking.config.ts
├─ data/                        # 爬虫产物（提交进仓库）
│  ├─ jobs.json  meta.json
├─ .github/workflows/deploy.yml # 镜像 AI-Search
├─ next.config.mjs  tailwind.config.ts  postcss.config.mjs  tsconfig.json
└─ docs/superpowers/specs/2026-05-29-career-search-aggregator-design.md
```

---

## 15. 实施顺序（高层，细化交给 writing-plans）

1. 框架迁移：Vite → Next.js 14 静态导出骨架（镜像 AI-Search 配置），现有组件可跑通。
2. 数据模型 + config 骨架 + 种子源 + persist（含 firstSeen diff）+ crawl 编排，本地 `npm run crawl` 产出 `jobs.json`。
3. ATS adapters（greenhouse/lever/ashby）+ fixtures + 单测。
4. 开源仓库 adapter（挑选并验证具体仓库）。
5. 构建时打分 + 前端筛选/排序/分页接通内嵌数据。
6. 客户端个性化（PrefsPanel + localStorage + match 重排）+ SourceStatusBanner。
7. Tier B 官网 adapter（尽力而为，1–2 个）。
8. deploy workflow + Pages 上线 + README 复用文档。

---

## 16. 风险与边界（务必明确）

- **"市面上所有信息"无法 100% 抓全**：Tier A 保稳定与合法；Tier B 补国内实时性但有缺口，由开源仓库 + 种子兜底。
- **CI 数据中心 IP 可能被部分站点封禁/限流**（已被 AI-Search 实例印证），Tier B 易失效——视为增量而非依赖。
- **开源仓库结构会变**：每个 repo 一个小解析器，结构变了只影响该源。
- **deadline/postedAt 常缺失**：用 firstSeen 兜底新鲜度；urgency 在无 deadline 时取中性。
- **ATS token 需逐个确认**：实现阶段验证每家公司确实用对应 ATS 且 board token 正确。

---

## 17. 未来可选（明确不在本期）

账号与云端收藏、邮件/推送提醒（临近截止）、简历关键词匹配打分、更多 Tier B 官网适配、站内「每日校招速报」（类似 AI-Search 的 daily）。
