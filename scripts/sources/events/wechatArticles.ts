import type { WechatArticle } from "../../../lib/eventTypes";
import { getText } from "../../lib/fetchUtil";

const GRAD_YEAR = new Date().getFullYear() + 1;
const GRAD_SHORT = GRAD_YEAR % 100;
const CUR_YEAR = new Date().getFullYear();
const QUERIES = [
  `${GRAD_SHORT}届校园招聘 秋招`,
  `${GRAD_YEAR}届 秋招 网申`,
  `名企校招 宣讲会 ${CUR_YEAR}`,
  `央企 校园招聘 ${GRAD_YEAR}`,
  `互联网大厂 秋招 ${GRAD_YEAR}届`,
  `管培生 校园招聘 ${GRAD_YEAR}`,
  `金融 校招 秋招 ${GRAD_YEAR}`,
];

function parseArticles(html: string): WechatArticle[] {
  const articles: WechatArticle[] = [];
  const blocks = html.match(/<div class="txt-box">[\s\S]*?<\/div>\s*<\/div>/gi) ?? [];

  for (const block of blocks) {
    const titleMatch = block.match(/<a[^>]*>([\s\S]*?)<\/a>/);
    const linkMatch = block.match(/href="([^"]+)"/);
    const accountMatch = block.match(/account_name[^>]*>([^<]+)/i) ?? block.match(/class="s-p"[^>]*>([^<]+)/i);
    const timeMatch = block.match(/timeConvert\('(\d+)'\)/) ?? block.match(/(\d{4}-\d{2}-\d{2})/);
    const summaryMatch = block.match(/<p class="txt-info">([\s\S]*?)<\/p>/);

    if (!titleMatch || !linkMatch) continue;

    const title = titleMatch[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”")
      .replace(/&mdash;/g, "—").replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .trim();

    if (!title || title.length < 5) continue;
    if (!/校招|秋招|春招|27届|2027|校园招聘|管培|宣讲|网申|实习|offer/.test(title)) continue;
    if (/幼儿园|小学|中学|高中|培训班|考研|考公/.test(title)) continue;

    let date = "";
    if (timeMatch) {
      if (timeMatch[1].length === 10) {
        date = new Date(parseInt(timeMatch[1]) * 1000).toISOString().slice(0, 10);
      } else {
        date = timeMatch[1];
      }
    }
    if (!date) date = new Date().toISOString().slice(0, 10);

    const daysAgo = (Date.now() - new Date(date).getTime()) / 86400000;
    if (daysAgo > 60) continue;

    const href = linkMatch[1].startsWith("http") ? linkMatch[1] : `https://weixin.sogou.com${linkMatch[1]}`;
    const account = accountMatch ? accountMatch[1].replace(/<[^>]+>/g, "").trim() : "微信公众号";
    const summary = summaryMatch ? summaryMatch[1].replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, "").trim().slice(0, 100) : undefined;

    articles.push({
      id: `wx-${Buffer.from(title.slice(0, 30)).toString("base64url").slice(0, 12)}`,
      title,
      account,
      date,
      url: href,
      summary,
    });
  }

  return articles;
}

export async function fetchWechatArticles(): Promise<WechatArticle[]> {
  const all: WechatArticle[] = [];
  const seen = new Set<string>();

  for (const query of QUERIES) {
    try {
      const url = `https://weixin.sogou.com/weixin?type=2&query=${encodeURIComponent(query)}&ie=utf8`;
      const html = await getText(url, { Referer: "https://weixin.sogou.com/" });
      const articles = parseArticles(html);
      for (const a of articles) {
        if (!seen.has(a.title)) {
          seen.add(a.title);
          all.push(a);
        }
      }
      await new Promise((r) => setTimeout(r, 2000));
    } catch (e) {
      console.warn(`[wechat-articles] Query "${query}" failed: ${(e as Error).message}`);
    }
  }

  all.sort((a, b) => b.date.localeCompare(a.date));
  console.log(`[wechat-articles] Found ${all.length} articles`);
  return all;
}
