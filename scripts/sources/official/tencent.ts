import type { JobType, RawJob } from "../../../lib/types";
import type { SourceAdapter } from "../types";

/**
 * 腾讯校招（join.qq.com）。
 *
 * 这是腾讯校园招聘站自己的接口，一次 POST 拿一页，848 个在招岗位全部是校招
 * （projectName 只有「应届毕业生 / 应届实习 / 青云计划」三类）。
 *
 * 之前 campusApi.ts 里用正则去匹配 join.qq.com 页面上的 data-title 属性，
 * 那个站是 SPA，首屏 HTML 里没有岗位数据，所以永远抓不到东西。
 */
const API = "https://join.qq.com/api/v1/position/searchPosition";
const PAGE_SIZE = 100;
const MAX_PAGES = 12;

interface TencentPosition {
  positionTitle: string;
  bgs?: string | null;
  workCities?: string | null;
  postId?: string | null;
  projectName?: string | null;
  recruitLabelName?: string | null;
  positionUrl?: string | null;
}

interface TencentResponse {
  status: number;
  data?: { count?: number; positionList?: TencentPosition[] };
}

async function fetchPage(pageIndex: number): Promise<{ list: TencentPosition[]; count: number }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Referer: "https://join.qq.com/post.html",
      },
      body: JSON.stringify({ recruitType: "", keyword: "", pageIndex, pageSize: PAGE_SIZE }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as TencentResponse;
    if (data.status !== 0) throw new Error(`腾讯 API status=${data.status}`);
    return { list: data.data?.positionList ?? [], count: data.data?.count ?? 0 };
  } finally {
    clearTimeout(timer);
  }
}

/** 「深圳总部 北京 上海 」-> ["深圳", "北京", "上海"] */
function parseCities(raw: string | null | undefined): string[] {
  if (!raw) return ["深圳"];
  const cities = raw
    .split(/[\s,，、]+/)
    .map((c) => c.replace(/总部$/, "").trim())
    .filter(Boolean);
  return cities.length ? [...new Set(cities)] : ["深圳"];
}

/** 应届实习 -> 暑期实习；应届毕业生/青云计划 -> 秋招 */
function toJobType(project: string | null | undefined, label: string | null | undefined): JobType {
  const s = `${project ?? ""} ${label ?? ""}`;
  if (s.includes("实习")) return "暑期实习";
  return "秋招";
}

export const tencent: SourceAdapter = {
  id: "official:tencent",
  label: "腾讯校招",
  async fetch(): Promise<RawJob[]> {
    const all: RawJob[] = [];
    const seen = new Set<string>();
    let count = 0;

    for (let page = 1; page <= MAX_PAGES; page++) {
      const { list, count: total } = await fetchPage(page);
      if (page === 1) count = total;
      if (!list.length) break;

      for (const p of list) {
        const title = (p.positionTitle ?? "").trim();
        const postId = String(p.postId ?? "");
        // 接口里有 5 条 postId 为负数的「项目实习生-XX」，那是聚合入口
        // 而不是具体岗位，拼出来的详情链接没有意义。
        if (!title || !/^\d{6,}$/.test(postId) || seen.has(postId)) continue;
        seen.add(postId);

        const bg = (p.bgs ?? "").trim().split(/\s+/).filter(Boolean);
        const tags = ["大厂", "官网"];
        if (p.recruitLabelName) tags.push(p.recruitLabelName.trim());
        if (bg.length && bg.length <= 3) tags.push(...bg);

        all.push({
          origin: "official:tencent",
          company: "腾讯",
          companyTier: 1,
          title,
          category: "互联网",
          jobType: toJobType(p.projectName, p.recruitLabelName),
          region: "大陆",
          location: parseCities(p.workCities),
          applyUrl: `https://join.qq.com/post_detail.html?postId=${postId}`,
          detailUrl: `https://join.qq.com/post_detail.html?postId=${postId}`,
          // 列表接口不返回 JD 正文，留空而不是编造
          description: null,
          tags,
        });
      }

      if (page * PAGE_SIZE >= count) break;
    }

    if (all.length === 0) throw new Error("腾讯校招接口返回 0 条，接口可能已变更");
    return all;
  },
};
