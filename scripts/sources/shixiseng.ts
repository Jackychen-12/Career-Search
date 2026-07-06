import type { RawJob } from "../../lib/types";
import { getJson } from "../lib/fetchUtil";
import type { SourceAdapter } from "./types";

interface SxsJob {
  uuid?: string;
  name?: string;
  cname?: string;
  city?: string;
  salary?: string;
  url?: string;
  refresh?: string;
}

const KEYWORDS = ["", "产品", "数据", "运营", "开发", "设计", "金融"];
const MAX_PAGES = 3;

export const shixiseng: SourceAdapter = {
  id: "shixiseng",
  label: "实习僧",
  async fetch(): Promise<RawJob[]> {
    const all: RawJob[] = [];
    const seen = new Set<string>();

    for (const kw of KEYWORDS) {
      for (let page = 1; page <= MAX_PAGES; page++) {
        try {
          const data = await getJson<{ data?: { list?: SxsJob[] } }>(
            `https://www.shixiseng.com/app/interns?keyword=${encodeURIComponent(kw)}&page=${page}&type=intern`,
            { Referer: "https://www.shixiseng.com/" },
          );
          const list = data?.data?.list ?? (Array.isArray(data) ? data as unknown as SxsJob[] : []);
          if (!list.length) break;

          for (const j of list) {
            const key = j.uuid || `${j.cname}|${j.name}`;
            if (seen.has(key)) continue;
            seen.add(key);

            all.push({
              origin: "shixiseng",
              company: j.cname || "未知",
              companyTier: 2,
              title: (j.name || "").trim(),
              category: "互联网",
              jobType: "日常实习",
              region: "大陆",
              location: j.city ? [j.city] : ["全国"],
              salary: j.salary || undefined,
              applyUrl: j.uuid
                ? `https://www.shixiseng.com/intern/${j.uuid}`
                : "https://www.shixiseng.com/",
              detailUrl: `https://www.shixiseng.com/intern/${j.uuid || ""}`,
              postedAt: j.refresh || null,
              tags: ["实习僧"],
            });
          }
        } catch (e) {
          console.warn(`[shixiseng] kw="${kw}" page=${page} failed: ${(e as Error).message}`);
          break;
        }
      }
    }
    return all;
  },
};
