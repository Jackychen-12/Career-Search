import type { Job } from "./types";

export interface EnrichedContext {
  inferredSkills: string[];
  inferredRoles: string[];
  inferredIndustry: string;
  titleKeywords: string[];
  confidence: number;
}

// ---------------------------------------------------------------------------
// Company Knowledge Base
// ---------------------------------------------------------------------------

interface CompanyProfile {
  skills: string[];
  roles: string[];
  industry: string;
}

const COMPANY_KB: [string[], CompanyProfile][] = [
  // 互联网
  [["百度", "baidu"], { skills: ["AI", "大模型", "NLP", "搜索", "自动驾驶", "Python", "C++", "深度学习", "推荐系统"], roles: ["算法工程师", "软件工程师", "产品经理", "数据分析师", "研究员"], industry: "互联网" }],
  [["字节跳动", "bytedance", "字节"], { skills: ["推荐系统", "短视频", "AI", "大模型", "数据分析", "Python", "Go", "AB测试", "策略"], roles: ["产品经理", "软件工程师", "算法工程师", "数据分析师", "运营"], industry: "互联网" }],
  [["tiktok"], { skills: ["推荐系统", "AI", "机器学习", "数据分析", "Python", "Go"], roles: ["software engineer", "产品经理", "算法工程师", "data scientist"], industry: "互联网" }],
  [["腾讯", "tencent"], { skills: ["游戏", "社交", "云计算", "AI", "大模型", "C++", "Go", "微信"], roles: ["软件工程师", "产品经理", "游戏策划", "算法工程师", "运营"], industry: "互联网" }],
  [["阿里巴巴", "阿里", "alibaba"], { skills: ["电商", "云计算", "AI", "大模型", "Java", "数据分析", "供应链"], roles: ["软件工程师", "产品经理", "算法工程师", "数据分析师"], industry: "互联网" }],
  [["美团", "meituan"], { skills: ["本地生活", "配送", "AI", "数据分析", "Java", "Go", "推荐系统"], roles: ["产品经理", "软件工程师", "算法工程师", "运营"], industry: "互联网" }],
  [["京东", "jd.com"], { skills: ["电商", "物流", "供应链", "AI", "Java", "数据分析"], roles: ["软件工程师", "产品经理", "算法工程师"], industry: "互联网" }],
  [["快手", "kuaishou"], { skills: ["短视频", "直播", "推荐系统", "AI", "C++", "Go", "数据分析"], roles: ["算法工程师", "软件工程师", "产品经理", "运营"], industry: "互联网" }],
  [["拼多多", "pinduoduo"], { skills: ["电商", "社交电商", "AI", "数据分析", "Java", "Go"], roles: ["软件工程师", "产品经理", "算法工程师", "运营"], industry: "互联网" }],
  [["小红书", "xiaohongshu"], { skills: ["社区", "电商", "推荐系统", "AI", "数据分析", "Python", "Go"], roles: ["产品经理", "算法工程师", "运营", "数据分析师"], industry: "互联网" }],
  [["哔哩哔哩", "bilibili", "b站"], { skills: ["视频", "社区", "AI", "大模型", "推荐系统", "Go", "Java"], roles: ["软件工程师", "算法工程师", "产品经理", "运营"], industry: "互联网" }],
  [["滴滴", "didi"], { skills: ["出行", "地图", "AI", "算法", "Python", "Go", "数据分析"], roles: ["算法工程师", "软件工程师", "产品经理", "数据分析师"], industry: "互联网" }],
  [["携程", "ctrip"], { skills: ["旅游", "酒店", "数据分析", "Java", "推荐系统", "AI"], roles: ["软件工程师", "产品经理", "数据分析师", "运营"], industry: "互联网" }],
  [["米哈游", "mihoyo", "hoyoverse"], { skills: ["游戏", "游戏引擎", "Unity", "Unreal", "C++", "AI", "3D"], roles: ["游戏开发", "游戏策划", "技术美术", "算法工程师"], industry: "互联网" }],
  [["多益网络"], { skills: ["游戏", "游戏引擎", "C++", "Java"], roles: ["游戏开发", "游戏策划", "软件工程师"], industry: "互联网" }],
  [["网易", "netease"], { skills: ["游戏", "音乐", "AI", "Java", "C++", "游戏引擎"], roles: ["游戏开发", "游戏策划", "软件工程师", "产品经理"], industry: "互联网" }],

  // 科技硬件
  [["华为", "huawei"], { skills: ["通信", "5G", "芯片", "云计算", "AI", "C++", "嵌入式", "鸿蒙"], roles: ["软件工程师", "硬件工程师", "算法工程师", "产品经理", "研究员"], industry: "实体" }],
  [["oppo"], { skills: ["手机", "IoT", "AI", "嵌入式", "Android", "C++"], roles: ["软件工程师", "硬件工程师", "产品经理", "算法工程师"], industry: "实体" }],
  [["小米", "xiaomi"], { skills: ["IoT", "智能硬件", "具身智能", "智能驾驶", "AI", "嵌入式", "C++"], roles: ["软件工程师", "硬件工程师", "产品经理", "算法工程师"], industry: "实体" }],
  [["大疆", "dji"], { skills: ["无人机", "机器人", "嵌入式", "C++", "计算机视觉", "AI", "SLAM"], roles: ["嵌入式工程师", "算法工程师", "机械工程师", "软件工程师"], industry: "实体" }],
  [["科大讯飞", "iflytek"], { skills: ["AI", "NLP", "语音识别", "大模型", "Python", "深度学习"], roles: ["算法工程师", "研究员", "产品经理", "软件工程师"], industry: "实体" }],
  [["商汤科技", "sensetime", "商汤"], { skills: ["AI", "计算机视觉", "深度学习", "大模型", "Python", "C++"], roles: ["算法工程师", "研究员", "产品经理", "软件工程师"], industry: "实体" }],
  [["虹软科技", "arcsoft"], { skills: ["AI", "计算机视觉", "深度学习", "C++", "嵌入式"], roles: ["算法工程师", "软件工程师", "研究员"], industry: "实体" }],
  [["普渡科技"], { skills: ["机器人", "AI", "嵌入式", "SLAM", "C++"], roles: ["算法工程师", "嵌入式工程师", "机械工程师"], industry: "实体" }],
  [["中兴通讯", "zte"], { skills: ["通信", "5G", "嵌入式", "C++", "网络"], roles: ["软件工程师", "硬件工程师", "通信工程师"], industry: "实体" }],
  [["中兴微电子"], { skills: ["芯片", "IC设计", "嵌入式", "C++", "Verilog"], roles: ["IC设计工程师", "嵌入式工程师", "验证工程师"], industry: "实体" }],
  [["兆易创新", "gigadevice"], { skills: ["芯片", "IC设计", "嵌入式", "C++", "MCU"], roles: ["IC设计工程师", "嵌入式工程师", "应用工程师"], industry: "实体" }],
  [["韶音科技", "shokz"], { skills: ["音频", "嵌入式", "硬件", "蓝牙", "C++"], roles: ["硬件工程师", "嵌入式工程师", "软件工程师"], industry: "实体" }],
  [["歌尔股份", "goertek"], { skills: ["声学", "传感器", "嵌入式", "精密制造", "VR"], roles: ["硬件工程师", "嵌入式工程师", "机械工程师"], industry: "实体" }],
  [["立讯精密", "luxshare"], { skills: ["精密制造", "连接器", "嵌入式", "自动化"], roles: ["硬件工程师", "嵌入式工程师", "工艺工程师"], industry: "实体" }],
  [["汇川技术", "inovance"], { skills: ["自动化", "伺服", "PLC", "嵌入式", "电气工程"], roles: ["嵌入式工程师", "电气工程师", "软件工程师"], industry: "实体" }],
  [["京东方", "boe"], { skills: ["面板", "显示", "半导体", "嵌入式"], roles: ["硬件工程师", "工艺工程师", "软件工程师"], industry: "实体" }],
  [["传音控股", "transsion"], { skills: ["手机", "嵌入式", "Android", "AI"], roles: ["软件工程师", "硬件工程师", "产品经理"], industry: "实体" }],
  [["英伟达", "nvidia"], { skills: ["GPU", "CUDA", "AI", "深度学习", "C++", "Python"], roles: ["software engineer", "研究员", "算法工程师"], industry: "实体" }],

  // 新能源汽车
  [["蔚来", "nio"], { skills: ["新能源", "智能驾驶", "AI", "嵌入式", "C++", "Python"], roles: ["算法工程师", "软件工程师", "嵌入式工程师", "产品经理"], industry: "实体" }],
  [["宇通集团", "宇通"], { skills: ["新能源", "智能驾驶", "嵌入式", "机械"], roles: ["机械工程师", "嵌入式工程师", "软件工程师"], industry: "实体" }],

  // 金融
  [["中金公司", "中金", "cicc"], { skills: ["投行", "IPO", "并购", "金融建模", "Excel", "财务分析"], roles: ["投行分析师", "研究员", "分析师"], industry: "金融" }],
  [["广发证券"], { skills: ["券商", "研究", "金融", "财务分析", "数据分析", "Excel"], roles: ["分析师", "研究员", "财务分析"], industry: "金融" }],
  [["兴业银行"], { skills: ["银行", "金融科技", "风控", "数据分析", "Java"], roles: ["金融科技", "风控分析", "软件工程师"], industry: "金融" }],
  [["高盛", "goldman sachs"], { skills: ["投行", "量化", "金融建模", "Python", "数据分析"], roles: ["analyst", "分析师", "量化分析", "投行"], industry: "金融" }],
  [["摩根大通", "jp morgan", "jpmorgan"], { skills: ["投行", "金融科技", "量化", "Python", "Java"], roles: ["analyst", "分析师", "software engineer", "量化"], industry: "金融" }],
  [["摩根士丹利", "morgan stanley"], { skills: ["投行", "量化", "金融建模", "Python"], roles: ["analyst", "分析师", "量化分析"], industry: "金融" }],
  [["汇丰银行", "hsbc", "汇丰"], { skills: ["银行", "金融", "风控", "数据分析"], roles: ["analyst", "分析师", "客户经理"], industry: "金融" }],

  // 四大/咨询
  [["普华永道", "pwc"], { skills: ["审计", "咨询", "财务", "数据分析", "Excel"], roles: ["审计", "咨询顾问", "分析师"], industry: "金融" }],
  [["安永", "ey", "ernst"], { skills: ["审计", "咨询", "财务", "数据分析"], roles: ["审计", "咨询顾问", "分析师"], industry: "金融" }],

  // 快消
  [["宝洁", "p&g", "procter"], { skills: ["市场营销", "品牌管理", "供应链", "数据分析", "消费者研究"], roles: ["管培生", "市场营销", "品牌经理", "供应链管理"], industry: "快消" }],
  [["联合利华", "unilever"], { skills: ["市场营销", "品牌管理", "供应链", "数据分析"], roles: ["管培生", "市场营销", "供应链管理"], industry: "快消" }],
  [["欧莱雅", "loreal"], { skills: ["市场营销", "品牌管理", "数字营销", "电商"], roles: ["管培生", "市场营销", "品牌经理"], industry: "快消" }],

  // 外企科技
  [["谷歌", "google"], { skills: ["software engineering", "AI", "machine learning", "Python", "Java", "C++", "分布式系统"], roles: ["software engineer", "research scientist", "product manager"], industry: "外企" }],
  [["微软", "microsoft"], { skills: ["cloud", "AI", "C++", "C#", "Python", "Azure", "分布式系统"], roles: ["software engineer", "product manager", "research scientist"], industry: "外企" }],
  [["亚马逊", "amazon"], { skills: ["cloud", "AWS", "Java", "分布式系统", "数据分析"], roles: ["software engineer", "product manager", "data scientist"], industry: "外企" }],

  // 实体/制造
  [["海尔", "haier"], { skills: ["家电", "IoT", "智能家居", "供应链", "制造"], roles: ["软件工程师", "硬件工程师", "产品经理", "管培生"], industry: "实体" }],
  [["海信", "hisense"], { skills: ["家电", "显示", "IoT", "嵌入式"], roles: ["软件工程师", "硬件工程师", "产品经理"], industry: "实体" }],
  [["美的", "midea"], { skills: ["家电", "IoT", "机器人", "供应链", "制造"], roles: ["软件工程师", "硬件工程师", "管培生"], industry: "实体" }],
  [["格力电器", "格力", "gree"], { skills: ["家电", "制造", "嵌入式", "电气工程"], roles: ["硬件工程师", "软件工程师", "管培生"], industry: "实体" }],
  [["三一重工", "sany"], { skills: ["重工", "机械", "嵌入式", "自动化"], roles: ["机械工程师", "嵌入式工程师", "管培生"], industry: "实体" }],
  [["方太", "fotile"], { skills: ["家电", "制造", "设计", "供应链"], roles: ["管培生", "工程师", "设计师"], industry: "实体" }],
  [["中国电信天翼云", "天翼云"], { skills: ["云计算", "通信", "大数据", "Java", "Go"], roles: ["软件工程师", "云架构师", "运维工程师"], industry: "实体" }],
  [["中国航天科工", "航天科工"], { skills: ["航天", "嵌入式", "C++", "通信", "系统工程"], roles: ["系统工程师", "软件工程师", "硬件工程师"], industry: "实体" }],
  [["基恩士", "keyence"], { skills: ["传感器", "视觉检测", "自动化", "嵌入式"], roles: ["销售工程师", "技术支持", "应用工程师"], industry: "外企" }],
  [["金科集团"], { skills: ["地产", "建筑", "管理", "金融"], roles: ["管培生", "投资", "工程师"], industry: "实体" }],
  [["海天集团"], { skills: ["调味品", "制造", "供应链", "销售"], roles: ["管培生", "销售", "供应链管理"], industry: "快消" }],
  [["牧原股份", "牧原"], { skills: ["畜牧", "养殖", "供应链", "数据分析"], roles: ["管培生", "兽医", "工程师"], industry: "实体" }],
  [["杰瑞集团", "杰瑞"], { skills: ["石油", "机械", "工程", "自动化"], roles: ["机械工程师", "工程师", "管培生"], industry: "实体" }],
];

function norm(s: string): string {
  return s.toLowerCase().replace(/[\s_\-·]/g, "");
}

const companyMap = new Map<string, CompanyProfile>();
for (const [keys, profile] of COMPANY_KB) {
  for (const key of keys) companyMap.set(norm(key), profile);
}

function lookupCompany(company: string): CompanyProfile | undefined {
  const cn = norm(company);
  const direct = companyMap.get(cn);
  if (direct) return direct;
  for (const [key, profile] of companyMap) {
    if (cn.includes(key) || key.includes(cn)) return profile;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Skill Synonym Map
// ---------------------------------------------------------------------------

const SYNONYM_GROUPS: string[][] = [
  ["ai", "人工智能", "artificialintelligence"],
  ["机器学习", "ml", "machinelearning"],
  ["深度学习", "dl", "deeplearning"],
  ["nlp", "自然语言处理", "naturallanguageprocessing"],
  ["计算机视觉", "cv", "computervision"],
  ["大模型", "llm", "largelanguagemodel", "大语言模型"],
  ["aigc", "生成式ai", "generativeai"],
  ["推荐系统", "推荐算法", "recommendation"],
  ["产品经理", "pm", "productmanager"],
  ["产品设计", "productdesign"],
  ["用户研究", "uxresearch", "用研", "userresearch"],
  ["需求分析", "requirementsanalysis"],
  ["数据分析", "dataanalysis", "数据驱动", "analytics"],
  ["商业分析", "ba", "businessanalysis", "businessanalyst"],
  ["运营", "operations", "用户运营", "内容运营"],
  ["市场营销", "marketing", "市场"],
  ["python"],
  ["java"],
  ["javascript", "js"],
  ["typescript", "ts"],
  ["c++", "cpp", "c/c++"],
  ["go", "golang"],
  ["sql", "数据库"],
  ["前端", "frontend", "front-end", "前端开发"],
  ["后端", "backend", "back-end", "后端开发"],
  ["全栈", "fullstack", "full-stack"],
  ["嵌入式", "embedded", "嵌入式开发"],
  ["算法", "algorithm"],
  ["金融", "finance", "financial"],
  ["投行", "investmentbanking", "ib", "投资银行"],
  ["量化", "quant", "quantitative", "量化交易"],
  ["风控", "riskmanagement", "风险管理"],
  ["资管", "assetmanagement", "资产管理"],
  ["审计", "audit", "auditing"],
  ["云计算", "cloud", "cloudcomputing"],
  ["devops", "运维"],
  ["芯片", "chip", "ic", "半导体", "semiconductor"],
  ["管培生", "管培", "管理培训生", "leadershipprogram"],
  ["供应链", "supplychain"],
  ["咨询", "consulting", "consultant", "咨询顾问"],
  ["softwareengineer", "软件工程师", "softwaredeveloper"],
  ["dataengineer", "数据工程师"],
  ["datascientist", "数据科学家"],
];

const synonymLookup = new Map<string, string[]>();
for (const group of SYNONYM_GROUPS) {
  const normed = group.map(norm);
  for (const term of normed) {
    synonymLookup.set(term, normed);
  }
}

export function expandWithSynonyms(terms: string[]): string[] {
  const expanded = new Set<string>();
  for (const t of terms) {
    const tn = norm(t);
    expanded.add(tn);
    const group = synonymLookup.get(tn);
    if (group) group.forEach((s) => expanded.add(s));
  }
  return [...expanded];
}

// ---------------------------------------------------------------------------
// Tag → Skill Mapping
// ---------------------------------------------------------------------------

const TAG_SKILL_MAP: Record<string, { skills: string[]; roles: string[] }> = {
  AI: { skills: ["AI", "机器学习", "深度学习", "Python"], roles: ["算法工程师", "研究员"] },
  产品: { skills: ["产品设计", "需求分析", "用户研究"], roles: ["产品经理"] },
  科技: { skills: ["软件开发", "AI"], roles: ["软件工程师", "算法工程师"] },
  芯片: { skills: ["IC设计", "嵌入式", "Verilog", "C++"], roles: ["IC设计工程师", "嵌入式工程师"] },
  金融: { skills: ["金融", "财务分析", "数据分析"], roles: ["分析师", "研究员"] },
  快消: { skills: ["市场营销", "品牌管理", "供应链"], roles: ["管培生", "市场营销"] },
  游戏: { skills: ["游戏引擎", "Unity", "C++", "3D"], roles: ["游戏开发", "游戏策划"] },
  家电: { skills: ["IoT", "嵌入式", "供应链", "制造"], roles: ["硬件工程师", "软件工程师"] },
  新能源: { skills: ["新能源", "电池", "嵌入式", "智能驾驶"], roles: ["嵌入式工程师", "电气工程师"] },
  制造: { skills: ["制造", "自动化", "嵌入式", "机械"], roles: ["机械工程师", "工艺工程师"] },
  机器人: { skills: ["机器人", "SLAM", "嵌入式", "AI", "C++"], roles: ["算法工程师", "嵌入式工程师"] },
  券商: { skills: ["金融", "投资", "研究", "数据分析"], roles: ["分析师", "研究员"] },
  Top投行: { skills: ["投行", "金融建模", "估值", "Excel"], roles: ["投行分析师", "分析师"] },
  四大: { skills: ["审计", "咨询", "财务", "数据分析"], roles: ["审计", "咨询顾问"] },
  管培: { skills: ["领导力", "管理", "沟通"], roles: ["管培生"] },
  XR: { skills: ["VR", "AR", "3D", "Unity", "C++"], roles: ["软件工程师", "算法工程师"] },
  面板: { skills: ["显示", "半导体", "嵌入式"], roles: ["工艺工程师", "硬件工程师"] },
  央企: { skills: ["管理"], roles: ["管培生", "工程师"] },
  硬件: { skills: ["硬件设计", "嵌入式", "电路", "PCB"], roles: ["硬件工程师"] },
};

// ---------------------------------------------------------------------------
// Title Keyword Extraction
// ---------------------------------------------------------------------------

const TITLE_ROLE_PATTERNS: [RegExp, string][] = [
  [/产品经理/, "产品经理"],
  [/算法/, "算法工程师"],
  [/研发|开发工程/, "软件工程师"],
  [/运营/, "运营"],
  [/数据分析/, "数据分析师"],
  [/研究员/, "研究员"],
  [/策略/, "策略分析"],
  [/具身智能/, "具身智能"],
  [/智能驾驶|自动驾驶/, "智能驾驶"],
  [/管培|管理培训/, "管培生"],
  [/投行|投资银行/, "投行"],
  [/software\s*engineer/i, "software engineer"],
  [/data\s*scientist/i, "data scientist"],
  [/data\s*analyst/i, "data analyst"],
  [/data\s*engineer/i, "data engineer"],
  [/product\s*manager/i, "product manager"],
  [/machine\s*learning/i, "machine learning engineer"],
  [/frontend|front[\s-]end/i, "frontend engineer"],
  [/backend|back[\s-]end/i, "backend engineer"],
  [/full[\s-]?stack/i, "full stack engineer"],
  [/embedded/i, "embedded engineer"],
  [/mechanical\s*engineer/i, "mechanical engineer"],
  [/electrical\s*engineer/i, "electrical engineer"],
  [/firmware/i, "firmware engineer"],
  [/devops|site\s*reliability|sre\b/i, "DevOps engineer"],
  [/security\s*engineer/i, "security engineer"],
  [/cloud\s*engineer/i, "cloud engineer"],
  [/mobile|ios\s*engineer|android\s*engineer/i, "mobile engineer"],
  [/robotics/i, "robotics engineer"],
  [/quantitative|quant\b/i, "quantitative analyst"],
  [/research(?:\s+scientist)?/i, "researcher"],
  [/\bai\b/i, "AI engineer"],
  [/\bml\b/i, "ML engineer"],
  [/\bnlp\b/i, "NLP engineer"],
  [/analyst/i, "分析师"],
];

const TITLE_SKILL_PATTERNS: [RegExp, string][] = [
  [/python/i, "Python"],
  [/java(?!script)/i, "Java"],
  [/javascript|\.js\b/i, "JavaScript"],
  [/typescript/i, "TypeScript"],
  [/c\+\+|cpp\b/i, "C++"],
  [/go(?:lang)\b/i, "Go"],
  [/rust\b/i, "Rust"],
  [/ruby\b/i, "Ruby"],
  [/sql\b/i, "SQL"],
  [/react\b/i, "React"],
  [/\bai\b/i, "AI"],
  [/machine\s*learning|\bml\b/i, "机器学习"],
  [/deep\s*learning|\bdl\b/i, "深度学习"],
  [/\bnlp\b/i, "NLP"],
  [/computer\s*vision/i, "计算机视觉"],
  [/大模型|llm/i, "大模型"],
  [/具身智能/, "具身智能"],
  [/智能驾驶|自动驾驶/, "智能驾驶"],
  [/robotics|机器人/, "机器人"],
];

// ---------------------------------------------------------------------------
// Role Families (for graduated role matching)
// ---------------------------------------------------------------------------

const ROLE_FAMILIES: string[][] = [
  ["产品经理", "策略产品", "数据产品", "ai产品", "productmanager"],
  ["软件工程师", "softwareengineer", "softwaredeveloper", "developer", "前端", "后端", "全栈", "frontendendgineer", "backendengineer"],
  ["算法工程师", "aiengineer", "mlengineer", "nlpengineer", "researchscientist", "研究员", "researcher"],
  ["数据分析师", "dataanalyst", "datascientist", "商业分析", "businessanalyst", "ba"],
  ["分析师", "analyst", "投行分析师", "量化分析", "researchanalyst", "quantitativeanalyst"],
  ["硬件工程师", "嵌入式工程师", "ic设计工程师", "embeddedengineer", "firmwareengineer", "electricalengineer"],
  ["管培生", "管理培训生", "leadershipprogram"],
  ["运营", "用户运营", "内容运营", "operations"],
  ["游戏开发", "游戏策划", "gamedeveloper"],
  ["机械工程师", "mechanicalengineer"],
];

const roleFamilyMap = new Map<string, string[]>();
for (const family of ROLE_FAMILIES) {
  const normed = family.map(norm);
  for (const r of normed) roleFamilyMap.set(r, normed);
}

export function isRelatedRole(userRole: string, candidateRoles: string[]): boolean {
  const family = roleFamilyMap.get(norm(userRole));
  if (!family) return false;
  return candidateRoles.some((cr) => {
    const cn = norm(cr);
    return family.some((f) => f.includes(cn) || cn.includes(f));
  });
}

// ---------------------------------------------------------------------------
// Main Enrichment Function
// ---------------------------------------------------------------------------

const cache = new WeakMap<Job, EnrichedContext>();

export function enrichJobContext(job: Job): EnrichedContext {
  const cached = cache.get(job);
  if (cached) return cached;

  const inferredSkills = new Set<string>();
  const inferredRoles = new Set<string>();
  let inferredIndustry: string = job.category;
  const titleKeywords: string[] = [];
  let signalCount = 0;

  const cp = lookupCompany(job.company);
  if (cp) {
    cp.skills.forEach((s) => inferredSkills.add(s));
    cp.roles.forEach((r) => inferredRoles.add(r));
    inferredIndustry = cp.industry || inferredIndustry;
    signalCount += 3;
  }

  for (const tag of job.tags) {
    const mapping = TAG_SKILL_MAP[tag];
    if (mapping) {
      mapping.skills.forEach((s) => inferredSkills.add(s));
      mapping.roles.forEach((r) => inferredRoles.add(r));
      signalCount += 1;
    }
  }

  for (const [pattern, role] of TITLE_ROLE_PATTERNS) {
    if (pattern.test(job.title)) {
      inferredRoles.add(role);
      titleKeywords.push(role);
      signalCount += 2;
    }
  }
  for (const [pattern, skill] of TITLE_SKILL_PATTERNS) {
    if (pattern.test(job.title)) {
      inferredSkills.add(skill);
      titleKeywords.push(skill);
      signalCount += 2;
    }
  }

  if (job.description && job.description.length > 10) {
    for (const [pattern, skill] of TITLE_SKILL_PATTERNS) {
      if (pattern.test(job.description)) {
        inferredSkills.add(skill);
        signalCount += 1;
      }
    }
    for (const [pattern, role] of TITLE_ROLE_PATTERNS) {
      if (pattern.test(job.description)) {
        inferredRoles.add(role);
        signalCount += 1;
      }
    }
  }

  const confidence = Math.min(signalCount / 10, 1);

  const result: EnrichedContext = {
    inferredSkills: [...inferredSkills],
    inferredRoles: [...inferredRoles],
    inferredIndustry,
    titleKeywords,
    confidence,
  };

  cache.set(job, result);
  return result;
}
