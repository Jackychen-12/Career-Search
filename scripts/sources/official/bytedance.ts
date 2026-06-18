import type { RawJob } from "../../../lib/types";
import { postJson } from "../../lib/fetchUtil";
import { STUDENT_ROLE } from "../greenhouse";
import type { SourceAdapter } from "../types";

const API = "https://jobs.bytedance.com/api/v1/search/job/posts";

interface BdPost {
  title: string;
  job_post_id?: string;
  id?: string;
  city_list?: { name: string }[];
  city_info?: { name: string };
  sub_title?: string;
}

export const bytedance: SourceAdapter = {
  id: "official:bytedance",
  label: "字节跳动官网",
  async fetch(): Promise<RawJob[]> {
    const data = await postJson<{ data?: { job_post_list?: BdPost[] } }>(
      API,
      {
        keyword: "实习",
        limit: 30,
        offset: 0,
        job_category_id_list: [],
        location_code_list: [],
        subject_id_list: [],
        recruitment_id_list: [],
        portal_type: 6,
      },
      { "portal-platform": "pc" },
    );
    const list = data?.data?.job_post_list ?? [];
    if (list.length === 0) throw new Error("empty / unexpected payload");
    return list
      .filter((p) => STUDENT_ROLE.test(p.title))
      .map((p) => {
      const id = p.job_post_id || p.id || "";
      const cities = p.city_list?.map((c) => c.name) ?? (p.city_info ? [p.city_info.name] : []);
      return {
        origin: "official:bytedance",
        company: "字节跳动",
        companyTier: 1,
        title: p.title.trim(),
        category: "互联网" as const,
        region: "大陆" as const,
        location: cities.length ? cities : ["全国"],
        applyUrl: id ? `https://jobs.bytedance.com/campus/position/${id}/detail` : "https://jobs.bytedance.com/campus",
        detailUrl: "https://jobs.bytedance.com/campus",
        description: p.sub_title ?? null,
        tags: ["大厂", "官网"],
      };
    });
  },
};
