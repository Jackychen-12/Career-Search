import type { RawJob } from "../../../lib/types";
import { UA } from "../../lib/fetchUtil";
import { STUDENT_ROLE } from "../greenhouse";
import type { SourceAdapter } from "../types";

const API = "https://job.xiaohongshu.com/api/campus/position/list";

interface XhsPost {
  id?: string;
  title: string;
  city?: string;
  department?: string;
  requirement?: string;
}

export const xiaohongshu: SourceAdapter = {
  id: "official:xiaohongshu",
  label: "小红书校招",
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
        type: "campus",
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} <- xiaohongshu`);
    const data = (await res.json()) as { data?: { list?: XhsPost[] } };
    const list = data?.data?.list ?? [];
    if (list.length === 0) throw new Error("empty / unexpected payload");
    return list
      .filter((p) => STUDENT_ROLE.test(p.title))
      .map((p) => ({
        origin: "official:xiaohongshu",
        company: "小红书",
        companyTier: 1,
        title: p.title.trim(),
        category: "互联网" as const,
        region: "大陆" as const,
        location: p.city ? p.city.split(/[,/、]/).map((s) => s.trim()) : ["上海"],
        applyUrl: p.id
          ? `https://job.xiaohongshu.com/campus/position/${p.id}`
          : "https://job.xiaohongshu.com/",
        detailUrl: "https://job.xiaohongshu.com/",
        description: p.requirement ?? null,
        tags: ["大厂", "官网"],
      }));
  },
};
