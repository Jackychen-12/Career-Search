import type { RawJob } from "../../lib/types";
import type { SourceAdapter } from "./types";

// Curated baseline. Always on, so the site is never empty and 国内大厂/金融/快消
// always have entries even when live crawlers return little. Links point at the
// company's official campus/careers page (stable). Keep deadlines in the future
// relative to the current recruiting season; expired rows are auto-dropped.

export const SEED_JOBS: RawJob[] = [
  // ───────────────────────── 互联网 / 科技大厂 ─────────────────────────
  { origin: "seed", company: "字节跳动", companyTier: 1, title: "2027 暑期实习 · 技术/产品/运营", category: "互联网", jobType: "暑期实习", location: ["北京", "上海", "杭州", "深圳"], salary: "300-600/天", requirements: "本科及以上", deadline: "2026-10-31", description: "覆盖抖音、TikTok、飞书、火山引擎等核心业务，表现优异可拿转正 offer。", applyUrl: "https://jobs.bytedance.com/campus", tags: ["大厂", "转正机会"] },
  { origin: "seed", company: "百度", companyTier: 1, title: "2027 AI 暑期实习", category: "互联网", jobType: "暑期实习", location: ["北京"], salary: "300-500/天", requirements: "本科及以上", deadline: "2026-11-30", description: "文心大模型、Apollo 自动驾驶、智能云方向算法与工程实习。", applyUrl: "https://talent.baidu.com/", tags: ["大厂", "AI"] },
  { origin: "seed", company: "滴滴", companyTier: 1, title: "日常实习 · 研发/算法", category: "互联网", jobType: "日常实习", location: ["北京"], salary: "200-400/天", requirements: "在校生", deadline: null, description: "网约车、地图、国际化业务长期实习，滚动招聘。", applyUrl: "https://campus.didiglobal.com/", tags: ["大厂", "长期实习"] },
  { origin: "seed", company: "小红书", companyTier: 1, title: "2027 暑期实习", category: "互联网", jobType: "暑期实习", location: ["上海", "北京"], salary: "300-500/天", requirements: "本科及以上", deadline: "2026-11-15", description: "社区、电商、算法、商业化多方向。", applyUrl: "https://job.xiaohongshu.com/", tags: ["大厂", "转正机会"] },
  { origin: "seed", company: "携程", companyTier: 2, title: "日常实习 · 多岗位", category: "互联网", jobType: "日常实习", location: ["上海"], salary: "150-300/天", requirements: "在校生", deadline: null, description: "旅游平台技术、产品、数据分析长期实习。", applyUrl: "https://careers.ctrip.com/", tags: ["长期实习"] },

  // ───────────────────────── 金融 ─────────────────────────
  { origin: "seed", company: "中金公司", companyTier: 1, title: "2027 暑期实习", category: "金融", jobType: "暑期实习", location: ["北京", "上海"], salary: "200-300/天", requirements: "硕士及以上", deadline: "2026-12-15", description: "投资银行部、研究部、固定收益部等暑期实习项目。", applyUrl: "https://www.cicc.com/", tags: ["头部券商", "Top投行"] },
  { origin: "seed", company: "高盛", companyTier: 1, title: "2027 Summer Analyst", category: "金融", jobType: "暑期实习", location: ["北京", "上海"], region: "大陆", salary: "10000+/月", requirements: "在校大学生", deadline: "2026-10-15", description: "全球顶级投行暑期项目，表现优异可获全职 offer。", applyUrl: "https://www.goldmansachs.com/careers/students-and-graduates/", tags: ["外资", "Top投行"] },
  { origin: "seed", company: "摩根大通", companyTier: 1, title: "2027 Summer Analyst", category: "金融", jobType: "暑期实习", location: ["上海"], region: "大陆", salary: "10000+/月", requirements: "本科及以上", deadline: "2026-10-01", description: "J.P. Morgan 全球暑期项目，投行/市场/资管方向。", applyUrl: "https://careers.jpmorgan.com/global/en/students", tags: ["外资", "Top投行"] },
  { origin: "seed", company: "摩根士丹利", companyTier: 1, title: "2027 暑期实习", category: "金融", jobType: "暑期实习", location: ["上海"], region: "大陆", requirements: "本科及以上", deadline: "2026-10-20", description: "Morgan Stanley 暑期分析师项目。", applyUrl: "https://www.morganstanley.com/people-opportunities/students-graduates", tags: ["外资", "Top投行"] },
  { origin: "seed", company: "汇丰银行", companyTier: 2, title: "2026 环球银行暑期实习", category: "金融", jobType: "暑期实习", location: ["上海", "广州"], requirements: "本科及以上", deadline: "2026-09-30", description: "HSBC 商业银行、环球银行与市场方向。", applyUrl: "https://www.hsbc.com/careers/students-and-graduates", tags: ["外资"] },
  { origin: "seed", company: "安永", companyTier: 2, title: "27届暑期实习", category: "金融", jobType: "暑期实习", location: ["北京", "上海", "广州", "深圳"], salary: "100-200/天", requirements: "本科及以上", deadline: "2026-08-31", description: "审计、税务、咨询暑期实习，有转正机会。", applyUrl: "https://www.ey.com/zh_cn/careers", tags: ["四大"] },
  { origin: "seed", company: "普华永道", companyTier: 2, title: "2026 精英计划暑期实习", category: "金融", jobType: "暑期实习", location: ["上海", "北京"], salary: "100-200/天", requirements: "本科及以上", deadline: "2026-08-20", description: "PwC 审计与咨询暑期实习。", applyUrl: "https://www.pwccn.com/zh/careers.html", tags: ["四大"] },

  // ───────────────────────── 外企 & 海外科技 ─────────────────────────
  { origin: "seed", company: "微软", companyTier: 1, title: "2027 暑期实习", category: "外企", jobType: "暑期实习", location: ["北京", "上海", "苏州"], region: "大陆", requirements: "本科及以上", deadline: "2026-11-30", description: "Microsoft 研发实习，Azure、Office、AI 等方向。", applyUrl: "https://careers.microsoft.com/v2/global/en/students.html", tags: ["外企", "科技"] },
  { origin: "seed", company: "谷歌", companyTier: 1, title: "2027 Internship (APAC)", category: "外企", jobType: "暑期实习", location: ["新加坡", "海外"], region: "海外", requirements: "本科及以上", deadline: "2026-10-31", description: "Google 软件工程暑期实习（亚太/海外）。", applyUrl: "https://careers.google.com/students/", tags: ["外企", "海外"] },
  { origin: "seed", company: "亚马逊", companyTier: 1, title: "2026 SDE Intern", category: "外企", jobType: "暑期实习", location: ["新加坡", "海外"], region: "海外", requirements: "本科及以上", deadline: "2026-09-30", description: "Amazon 软件开发实习，全球团队。", applyUrl: "https://www.amazon.jobs/content/en/career-programs/university", tags: ["外企", "海外"] },
  { origin: "seed", company: "英伟达", companyTier: 1, title: "2027 暑期实习", category: "外企", jobType: "暑期实习", location: ["上海", "北京", "海外"], requirements: "本科及以上", deadline: "2026-11-15", description: "NVIDIA 深度学习、芯片、系统软件方向。", applyUrl: "https://www.nvidia.com/en-us/about-nvidia/careers/university-recruiting/", tags: ["外企", "AI", "芯片"] },
  { origin: "seed", company: "Meta", companyTier: 1, title: "2027 University Internship", category: "外企", jobType: "暑期实习", location: ["海外"], region: "海外", requirements: "本科及以上", deadline: "2026-10-15", description: "Meta 软件工程与研究实习（海外）。", applyUrl: "https://www.metacareers.com/careerprograms/students/", tags: ["外企", "海外"] },
  { origin: "seed", company: "SAP", companyTier: 2, title: "27届暑期实习", category: "外企", jobType: "暑期实习", location: ["上海"], region: "大陆", requirements: "本科及以上", deadline: "2026-08-31", description: "企业软件研发与解决方案实习。", applyUrl: "https://jobs.sap.com/", tags: ["外企"] },

  // ───────────────────────── 快消 / 管培 ─────────────────────────
  { origin: "seed", company: "宝洁", companyTier: 1, title: "27届暑期实习", category: "快消", jobType: "暑期实习", location: ["广州", "上海", "北京"], salary: "350-450/天", requirements: "本科及以上", deadline: "2026-08-15", description: "P&G CBD、品牌、研发、供应链暑期实习。", applyUrl: "https://www.pgcareers.com/", tags: ["外企", "快消"] },
  { origin: "seed", company: "联合利华", companyTier: 1, title: "2026 UFLP 暑期实习", category: "管培", jobType: "暑期实习", location: ["上海"], salary: "300-400/天", requirements: "本科及以上", deadline: "2026-08-20", description: "Unilever 未来领袖计划暑期实习，转正进入管培。", applyUrl: "https://careers.unilever.com/", tags: ["外企", "管培"] },
  { origin: "seed", company: "欧莱雅", companyTier: 2, title: "27届暑期实习", category: "快消", jobType: "暑期实习", location: ["上海", "北京"], salary: "300/天", requirements: "本科及以上", deadline: "2026-08-31", description: "L'Oréal 市场、电商、研发暑期实习。", applyUrl: "https://www.loreal.com/en/careers/", tags: ["外企", "快消"] },

  // ───────────────────────── 实体 / 智能制造 ─────────────────────────
  { origin: "seed", company: "大疆", companyTier: 1, title: "2027 暑期实习", category: "实体", jobType: "暑期实习", location: ["深圳"], salary: "300-500/天", requirements: "本科及以上", deadline: "2026-11-30", description: "DJI 算法、嵌入式、机械、硬件研发实习。", applyUrl: "https://we.dji.com/", tags: ["科技", "硬件"] },
  { origin: "seed", company: "蔚来", companyTier: 2, title: "2027 暑期实习", category: "实体", jobType: "暑期实习", location: ["上海", "合肥"], salary: "200-400/天", requirements: "本科及以上", deadline: "2026-11-15", description: "NIO 自动驾驶、三电、智能座舱实习。", applyUrl: "https://www.nio.com/careers", tags: ["新能源"] },
  { origin: "seed", company: "商汤科技", companyTier: 2, title: "2027 暑期实习", category: "实体", jobType: "暑期实习", location: ["上海", "深圳"], salary: "300-500/天", requirements: "本科及以上", deadline: "2026-11-20", description: "SenseTime 大模型、CV、智能驾驶研发实习。", applyUrl: "https://www.sensetime.com/cn/join-us", tags: ["AI", "科技"] },







  // ───────────────────────── 27届提前批 ─────────────────────────
  { origin: "seed", company: "韶音科技", companyTier: 2, title: "27届提前批校园招聘", category: "实体", jobType: "秋招", location: ["深圳"], requirements: "应届毕业生", deadline: "2026-09-30", description: "Shokz 骨传导耳机全球领军品牌，硬件/软件/算法/产品/市场方向。", applyUrl: "https://www.shokz.com/", tags: ["提前批", "消费电子", "校招"] },
  { origin: "seed", company: "海尔", companyTier: 1, title: "27届提前批校园招聘", category: "实体", jobType: "秋招", location: ["青岛", "上海", "全国"], requirements: "应届毕业生", deadline: "2026-09-15", description: "海尔智家/卡奥斯工业互联网/海尔生物——研发、智造、市场方向。", applyUrl: "https://career.haier.net/", tags: ["提前批", "家电", "校招"] },
  { origin: "seed", company: "海信", companyTier: 1, title: "27届提前批校园招聘", category: "实体", jobType: "秋招", location: ["青岛", "深圳", "全国"], requirements: "应届毕业生", deadline: "2026-09-20", description: "海信视像/海信家电——AI、嵌入式、图像处理、产品方向。", applyUrl: "https://career.hisense.com/", tags: ["提前批", "家电", "校招"] },
  { origin: "seed", company: "牧原股份", companyTier: 1, title: "27届提前批校园招聘", category: "实体", jobType: "秋招", location: ["南阳", "郑州", "全国"], requirements: "应届毕业生", deadline: "2026-09-30", description: "牧原集团养殖/饲料/屠宰——技术研发、生产管理、财务管培方向。", applyUrl: "https://www.muyuanfoods.com/", tags: ["提前批", "农牧", "校招"] },
  { origin: "seed", company: "美的", companyTier: 1, title: "27届提前批校园招聘", category: "实体", jobType: "秋招", location: ["佛山", "上海", "深圳", "全国"], requirements: "应届毕业生", deadline: "2026-09-25", description: "美的集团智能家居/工业技术/楼宇科技——研发/供应链/营销管培。", applyUrl: "https://careers.midea.com/", tags: ["提前批", "家电", "校招"] },
  { origin: "seed", company: "格力电器", companyTier: 1, title: "27届提前批校园招聘", category: "实体", jobType: "秋招", location: ["珠海", "全国"], requirements: "应届毕业生", deadline: "2026-09-30", description: "空调/新能源/智能装备研发、制造、管理方向。", applyUrl: "https://gree.com/", tags: ["提前批", "家电", "校招"] },
  { origin: "seed", company: "TCL", companyTier: 2, title: "27届提前批校园招聘", category: "实体", jobType: "秋招", location: ["深圳", "惠州", "全国"], requirements: "应届毕业生", deadline: "2026-09-28", description: "TCL华星/TCL实业——显示/半导体/智能终端研发方向。", applyUrl: "https://www.tcl.com/", tags: ["提前批", "面板", "校招"] },
  { origin: "seed", company: "立讯精密", companyTier: 1, title: "27届提前批校园招聘", category: "实体", jobType: "秋招", location: ["东莞", "昆山", "全国"], requirements: "应届毕业生", deadline: "2026-09-30", description: "连接器/消费电子精密制造——工程/品质/IE/研发方向。", applyUrl: "https://www.luxshare-ict.com/", tags: ["提前批", "制造", "校招"] },
  { origin: "seed", company: "中兴通讯", companyTier: 1, title: "27届提前批校园招聘", category: "实体", jobType: "秋招", location: ["深圳", "南京", "西安", "上海"], requirements: "应届毕业生", deadline: "2026-09-25", description: "ZTE 5G/芯片/AI/云计算研发与产品方向。", applyUrl: "https://job.zte.com.cn/", tags: ["提前批", "通信", "校招"] },
  { origin: "seed", company: "传音控股", companyTier: 2, title: "27届提前批校园招聘", category: "实体", jobType: "秋招", location: ["深圳", "上海"], requirements: "应届毕业生", deadline: "2026-09-30", description: "非洲手机之王 TECNO/Infinix/itel——海外市场/研发/供应链方向。", applyUrl: "https://www.transsion.com/", tags: ["提前批", "出海", "校招"] },
  { origin: "seed", company: "三一重工", companyTier: 1, title: "27届提前批校园招聘", category: "实体", jobType: "秋招", location: ["长沙", "上海", "北京"], requirements: "应届毕业生", deadline: "2026-09-30", description: "工程机械龙头——智能制造/电气/液压/数字化研发方向。", applyUrl: "https://www.sany.com.cn/", tags: ["提前批", "重工", "校招"] },
  { origin: "seed", company: "歌尔股份", companyTier: 2, title: "27届提前批校园招聘", category: "实体", jobType: "秋招", location: ["潍坊", "青岛", "深圳"], requirements: "应届毕业生", deadline: "2026-09-25", description: "VR/AR/TWS声学——硬件/算法/光学/结构研发方向。", applyUrl: "https://www.goertek.com/", tags: ["提前批", "XR", "校招"] },

  // ───────────────────────── 7月已开放 · 互联网提前批/早鸟 ─────────────────────────
  { origin: "seed", company: "百度", companyTier: 1, title: "27届秋招正式批", category: "互联网", jobType: "秋招", location: ["北京", "上海", "深圳"], requirements: "应届毕业生", deadline: null, description: "百度2027届秋招正式批已开启，涵盖大模型、自动驾驶、智能云等方向的算法、工程、产品岗位。", applyUrl: "https://talent.baidu.com/", tags: ["大厂", "已开放", "AI"] },
  { origin: "seed", company: "字节跳动", companyTier: 1, title: "27届 AI 产品经理早鸟通道", category: "互联网", jobType: "秋招", location: ["北京", "上海", "深圳"], requirements: "2027届毕业生", deadline: null, description: "字节跳动AI产品经理早鸟通道，面向2027届学生提前锁定Offer，7-8月闭门面试活动，适合有AI产品项目经验的候选人。", applyUrl: "https://jobs.bytedance.com/campus", tags: ["大厂", "已开放", "AI", "产品"] },
  { origin: "seed", company: "腾讯", companyTier: 1, title: "2027 青云计划校招", category: "互联网", jobType: "秋招", location: ["深圳", "北京", "上海", "成都"], requirements: "2027届毕业生", deadline: null, description: "腾讯2027青云计划校招已启动，覆盖技术、产品、设计、市场方向。", applyUrl: "https://join.qq.com/", tags: ["大厂", "已开放", "校招"] },
  { origin: "seed", company: "OPPO", companyTier: 1, title: "2027届全球校园招聘", category: "实体", jobType: "秋招", location: ["东莞", "深圳", "北京"], requirements: "2027届毕业生", deadline: null, description: "OPPO 2027届全球校园招聘已启动，软件/硬件/AI/产品多方向。", applyUrl: "https://careers.oppo.com/campus", tags: ["已开放", "科技", "校招"] },
  { origin: "seed", company: "小米", companyTier: 1, title: "2027 顶尖校园招聘 · 具身智能&智能驾驶", category: "实体", jobType: "秋招", location: ["北京", "武汉", "南京"], requirements: "2027届毕业生", deadline: null, description: "小米2027全球顶尖校园招聘已启动，重点招聘具身智能和智能驾驶方向人才。", applyUrl: "https://hr.xiaomi.com/", tags: ["大厂", "已开放", "AI"] },
  { origin: "seed", company: "米哈游", companyTier: 1, title: "2027 校园招聘技术提前批", category: "互联网", jobType: "秋招", location: ["上海"], requirements: "2027届毕业生", deadline: null, description: "米哈游2027校园招聘技术提前批已开放，面向原神/星铁/绝区零等项目技术岗位。", applyUrl: "https://campus.mihoyo.com/", tags: ["已开放", "游戏", "提前批"] },
  { origin: "seed", company: "科大讯飞", companyTier: 1, title: "2027届校园招聘提前批", category: "实体", jobType: "秋招", location: ["合肥", "北京", "上海"], requirements: "2027届毕业生", deadline: null, description: "科大讯飞2027届「飞凡计划」秋招提前批正式启动，AI算法/工程/产品方向。", applyUrl: "https://campus.iflytek.com/", tags: ["已开放", "AI", "提前批"] },
  { origin: "seed", company: "哔哩哔哩", companyTier: 1, title: "27届提前批技术人才项目", category: "互联网", jobType: "秋招", location: ["上海"], requirements: "2027届毕业生", deadline: null, description: "B站b-up顶尖技术人才项目已启动，聚焦AI/大模型/推荐/视频技术方向。", applyUrl: "https://jobs.bilibili.com/campus", tags: ["已开放", "提前批"] },
  { origin: "seed", company: "快手", companyTier: 1, title: "2027届秋招校园大使招聘", category: "互联网", jobType: "秋招", location: ["北京"], requirements: "2027届毕业生", deadline: null, description: "快手2027届秋招校园大使招聘已启动。", applyUrl: "https://campus.kuaishou.cn/", tags: ["已开放"] },

  // ───────────────────────── 7月已开放 · 金融 ─────────────────────────
  { origin: "seed", company: "广发证券", companyTier: 2, title: "财务分析岗（在招）", category: "金融", jobType: "秋招", location: ["广州", "深圳"], requirements: "应届毕业生", deadline: null, description: "广发证券财务分析岗已开放招聘。", applyUrl: "https://www.gf.com.cn/", tags: ["已开放", "券商"] },
  { origin: "seed", company: "兴业银行", companyTier: 2, title: "金融科技人才提前批", category: "金融", jobType: "秋招", location: ["上海", "福州", "全国"], requirements: "应届毕业生", deadline: null, description: "兴业银行第五届数字兴业科技挑战赛暨金融科技人才提前批招聘已启动。", applyUrl: "https://www.cib.com.cn/", tags: ["已开放", "银行", "提前批"] },

  // ───────────────────────── 7月已开放 · 实体/制造提前批 ─────────────────────────
  { origin: "seed", company: "大疆", companyTier: 1, title: "2027「拓疆者」校招提前批", category: "实体", jobType: "秋招", location: ["深圳"], requirements: "2027届毕业生", deadline: null, description: "DJI 大疆「拓疆者」提前批已启动，算法/嵌入式/机械/硬件研发方向。", applyUrl: "https://we.dji.com/", tags: ["已开放", "科技", "提前批"] },
  { origin: "seed", company: "兆易创新", companyTier: 2, title: "2027 校园招聘提前批", category: "实体", jobType: "秋招", location: ["北京", "合肥", "西安"], requirements: "2027届毕业生", deadline: null, description: "兆易创新2027校园招聘提前批正式启动，芯片设计/嵌入式/测试方向。", applyUrl: "https://www.gigadevice.com/", tags: ["已开放", "芯片", "提前批"] },
  { origin: "seed", company: "虹软科技", companyTier: 2, title: "2027 秋招提前批", category: "实体", jobType: "秋招", location: ["杭州", "南京"], requirements: "2027届毕业生", deadline: null, description: "虹软科技2027秋招提前批正式开启，计算机视觉/AI算法方向。", applyUrl: "https://www.arcsoft.com.cn/", tags: ["已开放", "AI", "提前批"] },
  { origin: "seed", company: "汇川技术", companyTier: 2, title: "2027届校园招聘首批", category: "实体", jobType: "秋招", location: ["深圳", "苏州", "南京"], requirements: "2027届毕业生", deadline: null, description: "汇川技术2027届校园招聘首批岗位上新，工业自动化/机器人/新能源方向。", applyUrl: "https://www.inovance.com/", tags: ["已开放", "制造", "提前批"] },
  { origin: "seed", company: "京东方", companyTier: 1, title: "2027届「先锋京英计划」", category: "实体", jobType: "秋招", location: ["北京", "成都", "合肥", "重庆"], requirements: "2027届毕业生", deadline: null, description: "京东方2027届「先锋京英计划」全球招募正式启动，显示/传感/AI方向。", applyUrl: "https://zhaopin.boe.com/", tags: ["已开放", "面板", "校招"] },
  { origin: "seed", company: "中兴微电子", companyTier: 2, title: "2027届「未来领军」", category: "实体", jobType: "秋招", location: ["深圳", "上海", "南京", "西安"], requirements: "2027届毕业生", deadline: null, description: "中兴微电子2027届「未来领军」招募令已发布，芯片设计/验证/测试方向。", applyUrl: "https://job.zte.com.cn/", tags: ["已开放", "芯片", "提前批"] },
  { origin: "seed", company: "方太", companyTier: 2, title: "2027届暑期提前批", category: "实体", jobType: "秋招", location: ["宁波", "上海", "杭州"], requirements: "2027届毕业生", deadline: null, description: "方太集团2027届暑期提前批实习招聘已启动。", applyUrl: "https://www.fotile.com/", tags: ["已开放", "家电", "提前批"] },
  { origin: "seed", company: "宇通集团", companyTier: 2, title: "2027届提前批校园招聘", category: "实体", jobType: "秋招", location: ["郑州"], requirements: "2027届毕业生", deadline: null, description: "宇通集团2027届提前批校园招聘已启动，新能源客车/智能驾驶方向。", applyUrl: "https://www.yutong.com/", tags: ["已开放", "新能源", "提前批"] },
  { origin: "seed", company: "基恩士", companyTier: 1, title: "2027届秋招", category: "外企", jobType: "秋招", location: ["上海", "深圳", "北京", "苏州"], requirements: "2027届毕业生", deadline: null, description: "基恩士(中国)27届秋招已开启，传感器/测量/视觉系统方向，高薪外企。", applyUrl: "https://www.keyence.com.cn/", tags: ["已开放", "外企", "高薪"] },
  { origin: "seed", company: "杰瑞集团", companyTier: 2, title: "2027届秋招提前批", category: "实体", jobType: "秋招", location: ["烟台", "西安", "成都"], requirements: "2027届毕业生", deadline: null, description: "杰瑞集团秋招提前批已开启，石油装备/环保/新能源方向。", applyUrl: "https://www.jereh.com/", tags: ["已开放", "能源", "提前批"] },
  { origin: "seed", company: "中国电信天翼云", companyTier: 1, title: "2027届超级优才招聘", category: "实体", jobType: "秋招", location: ["北京", "上海", "全国"], requirements: "2027届毕业生", deadline: null, description: "中国电信天翼云2027届超级优才招聘正式启动，云计算/AI/安全方向。", applyUrl: "https://campus.chinatelecom.com.cn/", tags: ["已开放", "央企", "提前批"] },
  { origin: "seed", company: "中国航天科工", companyTier: 1, title: "2027届校园招聘提前批", category: "实体", jobType: "秋招", location: ["北京", "武汉", "全国"], requirements: "2027届毕业生", deadline: null, description: "中国航天科工集团2027届校园招聘提前批暨暑期开放日全面启动。", applyUrl: "https://www.casic.com.cn/", tags: ["已开放", "央企", "军工", "提前批"] },
  { origin: "seed", company: "金科集团", companyTier: 2, title: "2027届校园招聘", category: "实体", jobType: "秋招", location: ["重庆", "全国"], requirements: "2027届毕业生", deadline: null, description: "金科集团2027届校园招聘已启动。", applyUrl: "https://www.jinke.com/", tags: ["已开放", "地产", "校招"] },
  { origin: "seed", company: "多益网络", companyTier: 2, title: "2027届秋季提前批", category: "互联网", jobType: "秋招", location: ["广州"], requirements: "2027届毕业生", deadline: null, description: "多益网络2027届校园招聘秋季提前批开启，游戏开发/策划/美术方向。", applyUrl: "https://xz.duoyi.com/", tags: ["已开放", "游戏", "提前批"] },
  { origin: "seed", company: "普渡科技", companyTier: 2, title: "27届校招及28届实习", category: "实体", jobType: "秋招", location: ["深圳"], requirements: "2027届毕业生", deadline: null, description: "深圳普渡科技27届校招及28届实习招聘，配送机器人/具身智能方向。", applyUrl: "https://www.pudutech.com/", tags: ["已开放", "机器人", "校招"] },
  { origin: "seed", company: "海天集团", companyTier: 2, title: "2027届高潜专项招聘", category: "实体", jobType: "秋招", location: ["佛山", "全国"], requirements: "2027届毕业生", deadline: null, description: "海天集团2027届高潜专项招聘正式启动。", applyUrl: "https://www.haitian.com/", tags: ["已开放", "快消", "校招"] },
];

export const seed: SourceAdapter = {
  id: "seed",
  label: "种子清单",
  async fetch() {
    return SEED_JOBS;
  },
};
