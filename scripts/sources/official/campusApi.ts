/**
 * 各大厂校招官网 API 抓取
 * 部分公司有半公开的校招 JSON API，直接请求不需要登录
 *
 * 腾讯已拆到 official/tencent.ts（join.qq.com 真接口，848 条）。
 * 华为原本的 HTML 正则抓取已删：career.huawei.com 是 SPA，首屏没数据，
 * 它的 getJobList 接口现在返 404，需要重新找入口。
 * 美团、阿里保留但目前都拿不到数据（美团 SPA 无数据、阿里 403 风控），
 * 失败会通过 meta.errors 暴露而不再静默归零。
 */
import type { RawJob } from "../../../lib/types";
import { getJson, getText } from "../../lib/fetchUtil";
import type { SourceAdapter } from "../types";

interface CampusConfig {
  id: string;
  company: string;
  companyTier: number;
  category: "互联网" | "金融" | "实体";
  fetchFn: () => Promise<RawJob[]>;
}

// 美团校招 API（公开）
async function fetchMeituan(): Promise<RawJob[]> {
  try {
    const res = await getText("https://campus.meituan.com/recruit/campus/list");
    const match = res.match(/"list"\s*:\s*(\[[\s\S]*?\])/);
    if (!match) return [];
    const list = JSON.parse(match[1]) as { jobName: string; cityName: string; jobId: string }[];
    return list.slice(0, 50).map((j) => ({
      origin: "official:meituan",
      company: "美团",
      companyTier: 1,
      title: j.jobName,
      category: "互联网" as const,
      region: "大陆" as const,
      location: j.cityName ? j.cityName.split(",") : ["北京"],
      applyUrl: `https://campus.meituan.com/recruit/campus/detail/${j.jobId}`,
      tags: ["大厂", "官网"],
    }));
  } catch (e) {
    console.warn(`  [campus-api] 美团 HTML 解析失败: ${(e as Error).message}`);
    return [];
  }
}

// 阿里校招（talent API）
async function fetchAlibaba(): Promise<RawJob[]> {
  try {
    const data = await getJson<{ content?: { data?: { list?: { name: string; workLocation: string; id: number }[] } } }>(
      "https://talent.alibaba.com/position/search?_api=true&channel=campus&pageSize=30&pageIndex=1"
    );
    const list = data?.content?.data?.list ?? [];
    return list.map((j) => ({
      origin: "official:alibaba",
      company: "阿里巴巴",
      companyTier: 1,
      title: j.name,
      category: "互联网" as const,
      region: "大陆" as const,
      location: j.workLocation ? j.workLocation.split(",") : ["杭州"],
      applyUrl: `https://talent.alibaba.com/position/detail?positionId=${j.id}`,
      tags: ["大厂", "官网"],
    }));
  } catch (e) {
    console.warn(`  [campus-api] 阿里 API 失败: ${(e as Error).message}`);
    return [];
  }
}

export const campusApis: SourceAdapter = {
  id: "campus-api",
  label: "大厂校招API",
  async fetch(): Promise<RawJob[]> {
    const results = await Promise.allSettled([fetchMeituan(), fetchAlibaba()]);

    const all: RawJob[] = [];
    const names = ["美团", "阿里"];
    const empty: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        console.log(`  [campus-api] ${names[i]}: ${r.value.length} 条`);
        if (r.value.length === 0) empty.push(names[i]);
        all.push(...r.value);
      } else {
        console.warn(`  [campus-api] ${names[i]}: 失败 — ${r.reason?.message ?? r.reason}`);
        empty.push(names[i]);
      }
    });

    // 全部子源都没拿到数据时抛出，让 crawl 把它记到 meta.errors 里，
    // 前台 SourceStatusBanner 才看得见。
    if (all.length === 0) {
      throw new Error(`均未拿到数据: ${empty.join("、")}`);
    }
    return all;
  },
};
