# Career-Search

2026 暑期实习信息一站式聚合平台。

## 功能亮点

- **多维度筛选** — 按行业（互联网 / 金融 / 实体企业 / 管培生）、城市（北京 / 上海 / 深圳 / 广州 / 香港）快速定位目标岗位
- **实时信息聚合** — 覆盖字节跳动、腾讯、阿里巴巴、高盛、摩根大通、华为、宝洁等 20+ 头部企业暑期实习
- **截止日期提醒** — 临近截止的岗位自动高亮，不错过任何投递窗口
- **一键投递** — 直达官方申请页面，减少信息搜索成本

## 技术栈

| 技术 | 用途 |
|------|------|
| React 18 | UI 框架 |
| TypeScript | 类型安全 |
| Vite 6 | 构建工具 |
| GitHub Actions | CI/CD 自动部署 |
| GitHub Pages | 静态托管 |

## 项目结构

```
src/
├── main.tsx              # 入口
├── App.tsx               # Landing 页 + PhoneFrame 展示
├── types.ts              # 类型定义
├── components/           # 通用组件
│   ├── ErrorBoundary.tsx
│   ├── PhoneFrame.tsx
│   ├── StatCard.tsx
│   ├── FilterBar.tsx
│   └── InternshipCard.tsx
├── data/
│   └── internships.ts    # 岗位数据（集中管理，可替换为 API）
├── pages/
│   └── Home.tsx          # 主页面（统计 + 筛选 + 列表）
├── styles/
│   └── global.css        # 全局样式
└── utils/
    └── theme.ts          # 设计 Token
```

## 快速开始

```bash
# 安装依赖
npm install

# 本地开发
npm run dev

# 构建
npm run build

# 预览构建产物
npm run preview
```

## 部署

推送到 `main` 分支后，GitHub Actions 自动构建并部署到 GitHub Pages。

## 展示形态

桌面端采用 Landing 双栏布局：左侧功能介绍 + 右侧手机模拟器内嵌交互式 App，与 WealthPilot 保持一致的展示风格。

## License

MIT
