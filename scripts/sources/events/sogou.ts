import type { CampusEvent } from "../../../lib/eventTypes";
import { getText } from "../../lib/fetchUtil";

const SEARCH_URL = "https://weixin.sogou.com/weixin";
const QUERIES = ["校园宣讲会 2027届", "秋招宣讲会 2026", "校招宣讲 名企"];

function parseDate(text: string): string {
  const match = text.match(/(\d{4})[-.\/年](\d{1,2})[-.\/月](\d{1,2})/);
  if (match) return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  const recent = text.match(/(\d{1,2})[-.\/月](\d{1,2})/);
  if (recent) return `2026-${recent[1].padStart(2, "0")}-${recent[2].padStart(2, "0")}`;
  return "";
}

function extractCompany(title: string): string {
  const patterns = [
    /【([^】]+)】/,
    /「([^」]+)」/,
    /^([^\s|—–·]+?)(?:宣讲|校招|秋招|网申|27届)/,
  ];
  for (const p of patterns) {
    const m = title.match(p);
    if (m && m[1].length <= 15) return m[1].trim();
  }
  return title.slice(0, 12);
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

    const title = titleMatch[1].replace(/<[^>]+>/g, "").trim();
    if (!title || title.length < 5) continue;
    if (!/宣讲|校招|秋招|网申|27届|招聘/.test(title)) continue;

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
      source: "清华" as const,
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
