/**
 * 各大厂校招官网 API 抓取
 * 部分公司有半公开的校招 JSON API，直接请求不需要登录
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

// 腾讯校招（公开页面提取）
async function fetchTencent(): Promise<RawJob[]> {
  try {
    const html = await getText("https://join.qq.com/post.html?query=1&type=1");
    const jobs: RawJob[] = [];
    const matches = html.matchAll(/data-title="([^"]+)"[^>]*data-location="([^"]*)"[^>]*data-href="([^"]*)"/gi);
    for (const m of matches) {
      jobs.push({
        origin: "official:tencent",
        company: "腾讯",
        companyTier: 1,
        title: m[1],
        category: "互联网",
        region: "大陆",
        location: m[2] ? m[2].split(",") : ["深圳"],
        applyUrl: m[3].startsWith("http") ? m[3] : `https://join.qq.com${m[3]}`,
        tags: ["大厂", "官网"],
      });
    }
    return jobs.slice(0, 50);
  } catch (e) {
    console.warn(`  [campus-api] 腾讯 HTML 抓取失败: ${(e as Error).message}`);
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

// 华为校招
async function fetchHuawei(): Promise<RawJob[]> {
  try {
    const html = await getText("https://career.huawei.com/reccampportal/portal5/campus-recruitment.html");
    const jobs: RawJob[] = [];
    const matches = html.matchAll(/"jobName"\s*:\s*"([^"]+)".*?"workPlace"\s*:\s*"([^"]*)".*?"jobId"\s*:\s*"([^"]*)"/gi);
    for (const m of matches) {
      jobs.push({
        origin: "official:huawei",
        company: "华为",
        companyTier: 1,
        title: m[1],
        category: "实体",
        region: "大陆",
        location: m[2] ? m[2].split(",") : ["深圳"],
        applyUrl: `https://career.huawei.com/reccampportal/portal5/campus-recruitment-detail.html?jobId=${m[3]}`,
        tags: ["大厂", "官网"],
      });
    }
    return jobs.slice(0, 50);
  } catch (e) {
    console.warn(`  [campus-api] 华为 HTML 解析失败: ${(e as Error).message}`);
    return [];
  }
}

export const campusApis: SourceAdapter = {
  id: "campus-api",
  label: "大厂校招API",
  async fetch(): Promise<RawJob[]> {
    const results = await Promise.allSettled([
      fetchMeituan(),
      fetchTencent(),
      fetchAlibaba(),
      fetchHuawei(),
    ]);

    const all: RawJob[] = [];
    const names = ["美团", "腾讯", "阿里", "华为"];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        console.log(`  [campus-api] ${names[i]}: ${r.value.length} 条`);
        all.push(...r.value);
      } else {
        console.warn(`  [campus-api] ${names[i]}: 失败 — ${r.reason?.message ?? r.reason}`);
      }
    });

    return all;
  },
};
