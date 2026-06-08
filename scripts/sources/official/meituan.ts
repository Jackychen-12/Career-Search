import type { RawJob } from "../../../lib/types";
import { UA } from "../../lib/fetchUtil";
import { STUDENT_ROLE } from "../greenhouse";
import type { SourceAdapter } from "../types";

const API = "https://campus.meituan.com/api/campus/recruit/social/position/list";

interface MtPost {
  jobId?: string;
  jobName: string;
  cityName?: string;
  categoryName?: string;
  requirement?: string;
  updateTime?: string;
}

export const meituan: SourceAdapter = {
  id: "official:meituan",
  label: "美团校招",
  async fetch(): Promise<RawJob[]> {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        limit: 40,
        offset: 0,
        jobType: 1,
        keyword: "",
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} <- meituan`);
    const data = (await res.json()) as { data?: { list?: MtPost[] } };
    const list = data?.data?.list ?? [];
    if (list.length === 0) throw new Error("empty / unexpected payload");
    return list
      .filter((p) => STUDENT_ROLE.test(p.jobName))
      .map((p) => ({
        origin: "official:meituan",
        company: "美团",
        companyTier: 1,
        title: p.jobName.trim(),
        category: "互联网" as const,
        region: "大陆" as const,
        location: p.cityName ? p.cityName.split(/[,/、]/).map((s) => s.trim()) : ["北京"],
        applyUrl: p.jobId
          ? `https://campus.meituan.com/recruit/detail/${p.jobId}`
          : "https://campus.meituan.com/",
        detailUrl: "https://campus.meituan.com/",
        description: p.requirement ?? null,
        tags: ["大厂", "官网"],
      }));
  },
};
