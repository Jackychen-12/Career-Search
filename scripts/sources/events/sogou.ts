import type { CampusEvent } from "../../../lib/eventTypes";
import { getText } from "../../lib/fetchUtil";

const SEARCH_URL = "https://weixin.sogou.com/weixin";
const GRAD_YEAR = new Date().getFullYear() + 1;
const CUR_YEAR = new Date().getFullYear();
const QUERIES = [
  `校园宣讲会 ${GRAD_YEAR}届`,
  `${GRAD_YEAR}届校园招聘 宣讲`,
  `秋招宣讲会 名企 ${CUR_YEAR}`,
  `央企 校园招聘 宣讲 ${GRAD_YEAR}`,
  `互联网 校招 宣讲会 ${GRAD_YEAR}`,
];

function parseDate(text: string): string {
  const match = text.match(/(\d{4})[-.\/年](\d{1,2})[-.\/月](\d{1,2})/);
  if (match) return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  const recent = text.match(/(\d{1,2})[-.\/月](\d{1,2})/);
  if (recent) return `${new Date().getFullYear()}-${recent[1].padStart(2, "0")}-${recent[2].padStart(2, "0")}`;
  return "";
}

function extractCompany(title: string): string {
  // Clean HTML entities
  const cleaned = title
    .replace(/&[a-z]+;/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Priority: scan for known company names first
  const known = [
    "华为", "华为慧通", "比亚迪", "腾讯", "阿里", "字节跳动", "美团", "百度", "京东", "小米",
    "中广核", "中国黄金", "中建", "中粮", "国家电网", "中国移动", "中国银行", "国电南自",
    "碧桂园", "万科", "恒大", "光大证券", "南京银行", "招商银行", "工商银行",
    "国机集团", "软通动力", "上汽通用五菱", "上汽", "韶音科技", "格见半导体", "长城证券",
    "双胞胎集团", "微派网络", "南理工",
  ];
  for (const k of known) {
    if (cleaned.includes(k)) return k;
  }

  // Fallback: bracket or regex patterns
  const bracket = cleaned.match(/【([^】]{2,10})】/) ?? cleaned.match(/「([^」]{2,10})」/);
  if (bracket) {
    const name = bracket[1].replace(/(专场|校招|宣讲|招聘|春招|秋招)$/, "").trim();
    if (name.length >= 2) return name;
  }

  const companyMatch = cleaned.match(/([^\s|｜·!！,，]{2,8}?)(?:2027|2026|27届|校园招聘)/);
  if (companyMatch) {
    const name = companyMatch[1].replace(/^(实习|招聘|活动预告)\s*[|｜]\s*/, "").trim();
    if (name.length >= 2 && name.length <= 10) return name;
  }

  return cleaned.replace(/[【】「」]/g, "").slice(0, 8);
}

function detectType(title: string): CampusEvent["type"] {
  if (/宣讲/.test(title)) return "宣讲会";
  if (/网申/.test(title)) return "网申";
  if (/笔试/.test(title)) return "笔试";
  if (/面试/.test(title)) return "面试";
  return "其他";
}

function detectSchool(text: string): string {
  if (/清华/.test(text)) return "清华大学";
  if (/北大|北京大学/.test(text)) return "北京大学";
  if (/复旦/.test(text)) return "复旦大学";
  if (/上交|上海交/.test(text)) return "上海交通大学";
  if (/浙大|浙江大学/.test(text)) return "浙江大学";
  if (/人大|人民大学/.test(text)) return "中国人民大学";
  return "综合";
}

async function searchSogou(query: string): Promise<CampusEvent[]> {
  const url = `${SEARCH_URL}?type=2&query=${encodeURIComponent(query)}&ie=utf8`;
  const html = await getText(url, { Referer: "https://weixin.sogou.com/" });
  const events: CampusEvent[] = [];

  // Extract article entries from search results
  const articles = html.match(/<div class="txt-box">[\s\S]*?<\/div>\s*<\/div>/gi) ?? [];

  for (const article of articles) {
    const titleMatch = article.match(/<a[^>]*>([\s\S]*?)<\/a>/);
    const linkMatch = article.match(/href="([^"]+)"/);
    const accountMatch = article.match(/account_name[^>]*>([^<]+)/i) ?? article.match(/class="s-p"[^>]*>([^<]+)/i);
    const timeMatch = article.match(/timeConvert\('(\d+)'\)/) ?? article.match(/(\d{4}-\d{2}-\d{2})/);

    if (!titleMatch || !linkMatch) continue;

    const title = titleMatch[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”")
      .replace(/&mdash;/g, "—").replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ")
      .trim();
    if (!title || title.length < 5) continue;
    if (!/宣讲|校招|秋招|网申|27届|校园招聘/.test(title)) continue;
    if (/幼儿园|小学|中学|高中|培训班|考研|考公|公务员/.test(title)) continue;

    let date = "";
    if (timeMatch) {
      if (timeMatch[1].length === 10) {
        date = new Date(parseInt(timeMatch[1]) * 1000).toISOString().slice(0, 10);
      } else {
        date = parseDate(timeMatch[1]);
      }
    }
    if (!date) date = new Date().toISOString().slice(0, 10);

    const daysAgo = (Date.now() - new Date(date).getTime()) / 86400000;
    if (daysAgo > 30) continue;

    const company = extractCompany(title);
    const href = linkMatch[1].startsWith("http") ? linkMatch[1] : `https://weixin.sogou.com${linkMatch[1]}`;

    events.push({
      id: `sogou-${Buffer.from(title.slice(0, 30)).toString("base64url").slice(0, 12)}`,
      company,
      title,
      type: detectType(title),
      date,
      school: detectSchool(title),
      url: href,
      source: "微信" as const,
    });
  }

  return events;
}

export async function fetchSogouEvents(): Promise<CampusEvent[]> {
  const all: CampusEvent[] = [];
  const seen = new Set<string>();

  for (const q of QUERIES) {
    try {
      const results = await searchSogou(q);
      for (const e of results) {
        if (!seen.has(e.title)) {
          seen.add(e.title);
          all.push(e);
        }
      }
      await new Promise((r) => setTimeout(r, 2000));
    } catch (e) {
      console.warn(`[events:sogou] Query "${q}" failed: ${(e as Error).message}`);
    }
  }

  console.log(`[events:sogou] Found ${all.length} events from WeChat articles`);
  return all;
}
