import type { RawJob } from "../../../lib/types";
import { UA } from "../../lib/fetchUtil";
import { STUDENT_ROLE } from "../greenhouse";
import type { SourceAdapter } from "../types";

const API = "https://campus.kuaishou.cn/recruit/campus/v2/list";

interface KsPost {
  id?: string;
  jobName: string;
  cityName?: string;
  jobCategory?: string;
  updateTime?: string;
}

export const kuaishou: SourceAdapter = {
  id: "official:kuaishou",
  label: "快手校招",
  async fetch(): Promise<RawJob[]> {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        pageNo: 1,
        pageSize: 40,
        keyword: "",
        jobType: 1,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} <- kuaishou`);
    const data = (await res.json()) as { data?: { list?: KsPost[] } };
    const list = data?.data?.list ?? [];
    if (list.length === 0) throw new Error("empty / unexpected payload");
    return list
      .filter((p) => STUDENT_ROLE.test(p.jobName))
      .map((p) => ({
        origin: "official:kuaishou",
        company: "快手",
        companyTier: 1,
        title: p.jobName.trim(),
        category: "互联网" as const,
        region: "大陆" as const,
        location: p.cityName ? p.cityName.split(/[,/、]/).map((s) => s.trim()) : ["北京"],
        applyUrl: p.id
          ? `https://campus.kuaishou.cn/recruit/campus/detail/${p.id}`
          : "https://campus.kuaishou.cn/",
        detailUrl: "https://campus.kuaishou.cn/",
        tags: ["大厂", "官网"],
      }));
  },
};
