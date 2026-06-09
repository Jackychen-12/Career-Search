/**
 * 牛客网校招讨论区爬虫
 * 抓取校招信息汇总帖中的岗位链接
 */
import type { RawJob } from "../../lib/types";
import { getText } from "../lib/fetchUtil";
import type { SourceAdapter } from "./types";

const URLS = [
  "https://www.nowcoder.com/discuss/tag/2802",  // 校招tag
  "https://www.nowcoder.com/discuss/tag/2644",  // 秋招tag
];

function extractJobsFromHtml(html: string): RawJob[] {
  const jobs: RawJob[] = [];
  // 提取讨论帖标题中的校招信息
  const titleMatches = html.matchAll(/<a[^>]*href="(\/discuss\/\d+)"[^>]*>([\s\S]*?)<\/a>/gi);

  for (const match of titleMatches) {
    const url = match[1];
    const title = match[2].replace(/<[^>]+>/g, "").trim();

    if (!title || title.length < 8) continue;
    if (!/校招|秋招|春招|实习|27届|2027|招聘|内推|网申/.test(title)) continue;
    if (/面经|经验|总结|感受|吐槽|比较/.test(title)) continue;

    // 尝试从标题提取公司名
    const companyMatch = title.match(/【([^】]{2,10})】/) ?? title.match(/^([^\s,，]{2,8})(?:2027|27届|校招|秋招|春招|实习)/);
    const company = companyMatch ? companyMatch[1].trim() : "";
    if (!company) continue;

    jobs.push({
      origin: "nowcoder",
      company,
      companyTier: 2,
      title: title.slice(0, 60),
      category: "互联网",
      jobType: /实习/.test(title) ? "日常实习" : "秋招",
      location: [],
      region: "大陆",
      applyUrl: `https://www.nowcoder.com${url}`,
      detailUrl: `https://www.nowcoder.com${url}`,
      tags: ["牛客网"],
    });
  }

  return jobs;
}

export const nowcoder: SourceAdapter = {
  id: "nowcoder",
  label: "牛客网",
  async fetch(): Promise<RawJob[]> {
    const all: RawJob[] = [];
    for (const url of URLS) {
      try {
        const html = await getText(url);
        const jobs = extractJobsFromHtml(html);
        all.push(...jobs);
      } catch (e) {
        console.warn(`[nowcoder] ${url} failed: ${(e as Error).message}`);
      }
    }
    const seen = new Set<string>();
    return all.filter((j) => {
      const key = `${j.company}|${j.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },
};
