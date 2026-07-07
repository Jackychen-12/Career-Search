import type { RawJob } from "../../../lib/types";
import { getText, truncate } from "../../lib/fetchUtil";
import type { SourceAdapter } from "../types";

const API = "https://talent.baidu.com/httservice/getPostListNew";

interface BaiduPost {
  name: string;
  postId: string;
  jobId?: string;
  publishDate?: string;
  updateDate?: string;
  serviceCondition?: string;
  postType?: string;
  education?: string;
}

async function fetchPage(recruitType: string, page: number): Promise<{ list: BaiduPost[]; total: number }> {
  const body = `recruitType=${recruitType}&pageSize=20&curPage=${page}`;
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      "Referer": "https://talent.baidu.com/jobs/list",
    },
    body,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { status: string; data?: { list?: BaiduPost[]; total?: string } };
  if (data.status !== "ok" || !data.data) throw new Error("百度 API 返回异常");
  return {
    list: data.data.list ?? [],
    total: parseInt(data.data.total ?? "0", 10),
  };
}

function parseLocation(condition: string | undefined): string[] {
  if (!condition) return ["北京"];
  const cityMatch = condition.match(/^([^-\n,，]+)/);
  if (cityMatch) return [cityMatch[1].trim()];
  return ["北京"];
}

export const baidu: SourceAdapter = {
  id: "official:baidu",
  label: "百度官网",
  async fetch(): Promise<RawJob[]> {
    const all: RawJob[] = [];

    for (const [recruitType, jobType] of [["GRADUATE", "秋招"], ["INTERN", "日常实习"]] as const) {
      let page = 1;
      while (page <= 5) {
        try {
          const { list, total } = await fetchPage(recruitType, page);
          if (!list.length) break;

          for (const p of list) {
            const title = (p.name || "").replace(/\([^)]+\)$/, "").trim();
            if (!title) continue;
            
            const loc = title.match(/^([^-]+)-/);
            const location = loc ? [loc[1].trim()] : parseLocation(p.serviceCondition);

            all.push({
              origin: "official:baidu",
              company: "百度",
              companyTier: 1,
              title,
              category: "互联网",
              jobType: jobType as any,
              region: "大陆",
              location,
              applyUrl: p.postId
                ? `https://talent.baidu.com/jobs/detail/${p.postId}`
                : "https://talent.baidu.com/jobs/list",
              detailUrl: "https://talent.baidu.com/jobs/list",
              postedAt: p.publishDate || p.updateDate || null,
              description: p.serviceCondition ? truncate(p.serviceCondition, 150) : null,
              tags: ["大厂", "官网"],
            });
          }

          if (page * 20 >= total) break;
          page++;
        } catch (e) {
          console.warn(`[baidu] ${recruitType} page ${page}: ${(e as Error).message}`);
          break;
        }
      }
    }
    return all;
  },
};
