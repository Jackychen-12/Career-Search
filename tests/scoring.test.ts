import { daysUntil, computeId, detectRegion, detectJobType, normalizeRaw, finalizeJobs } from "../lib/scoring";
import type { RawJob } from "../lib/types";

describe("daysUntil", () => {
  test("返回正确天数", () => {
    const now = new Date("2026-06-08");
    expect(daysUntil("2026-06-15", now)).toBe(7);
    expect(daysUntil("2026-06-08", now)).toBe(0);
    expect(daysUntil("2026-06-01", now)).toBe(-7);
  });

  test("null deadline 返回 null", () => {
    expect(daysUntil(null)).toBeNull();
    expect(daysUntil(undefined)).toBeNull();
    expect(daysUntil("")).toBeNull();
  });
});

describe("computeId", () => {
  test("相同输入生成相同 ID", () => {
    const id1 = computeId("字节跳动", "产品经理", ["北京"]);
    const id2 = computeId("字节跳动", "产品经理", ["北京"]);
    expect(id1).toBe(id2);
  });

  test("不同输入生成不同 ID", () => {
    const id1 = computeId("字节跳动", "产品经理", ["北京"]);
    const id2 = computeId("腾讯", "产品经理", ["深圳"]);
    expect(id1).not.toBe(id2);
  });
});

describe("detectRegion", () => {
  test("检测海外", () => {
    expect(detectRegion(["新加坡"])).toBe("海外");
    expect(detectRegion(["overseas"])).toBe("海外");
  });

  test("检测香港", () => {
    expect(detectRegion(["香港"])).toBe("香港");
  });

  test("默认大陆", () => {
    expect(detectRegion(["北京"])).toBe("大陆");
    expect(detectRegion(["上海", "杭州"])).toBe("大陆");
  });

  test("显式指定优先", () => {
    expect(detectRegion(["北京"], "海外")).toBe("海外");
  });
});

describe("detectJobType", () => {
  test("暑期实习", () => {
    expect(detectJobType("2027 暑期实习")).toBe("暑期实习");
    expect(detectJobType("Summer Intern 2027")).toBe("暑期实习");
  });

  test("秋招", () => {
    expect(detectJobType("27届秋招")).toBe("秋招");
    expect(detectJobType("校园招聘")).toBe("秋招");
  });

  test("日常实习", () => {
    expect(detectJobType("日常实习 研发")).toBe("日常实习");
  });
});

describe("normalizeRaw", () => {
  test("正确标准化", () => {
    const raw: RawJob = {
      origin: "test",
      company: "  字节跳动  ",
      title: "AI 产品经理 ",
      applyUrl: "https://example.com",
      location: ["北京", "上海"],
      category: "互联网",
    };
    const result = normalizeRaw(raw);
    expect(result.company).toBe("字节跳动");
    expect(result.title).toBe("AI 产品经理");
    expect(result.region).toBe("大陆");
    expect(result.id).toMatch(/^j/);
  });
});

describe("finalizeJobs 同名岗位去重", () => {
  const base = (over: Partial<RawJob>): RawJob => ({
    origin: "test",
    company: "腾讯",
    title: "算法-机器学习方向",
    location: ["深圳", "北京"],
    applyUrl: "https://join.qq.com/post_detail.html?postId=1",
    ...over,
  });

  test("同名同城但招聘类型不同的岗位都保留", () => {
    const jobs = finalizeJobs(
      [
        base({ jobType: "秋招", applyUrl: "https://x/1" }),
        base({ jobType: "暑期实习", applyUrl: "https://x/2" }),
      ],
      undefined,
      new Date("2026-08-24"),
    );
    expect(jobs).toHaveLength(2);
    expect(jobs.map((j) => j.jobType).sort()).toEqual(["秋招", "暑期实习"].sort());
    expect(new Set(jobs.map((j) => j.id)).size).toBe(2);
  });

  test("秋招保留原始 id，其他类型才加后缀", () => {
    const bare = computeId("腾讯", "算法-机器学习方向", ["深圳"]);
    const jobs = finalizeJobs(
      [base({ jobType: "暑期实习" }), base({ jobType: "秋招" })],
      undefined,
      new Date("2026-08-24"),
    );
    expect(jobs.find((j) => j.jobType === "秋招")!.id).toBe(bare);
    expect(jobs.find((j) => j.jobType === "暑期实习")!.id).not.toBe(bare);
  });

  test("无碰撞时 id 与 computeId 一致，不受本次改动影响", () => {
    const jobs = finalizeJobs([base({ jobType: "秋招" })], undefined, new Date("2026-08-24"));
    expect(jobs).toHaveLength(1);
    expect(jobs[0].id).toBe(computeId("腾讯", "算法-机器学习方向", ["深圳"]));
  });

  test("完全相同的岗位仍然合并成一条", () => {
    const jobs = finalizeJobs(
      [base({ jobType: "秋招" }), base({ jobType: "秋招", description: "JD" })],
      undefined,
      new Date("2026-08-24"),
    );
    expect(jobs).toHaveLength(1);
    expect(jobs[0].description).toBe("JD");
  });

  test("拆分后的 id 跨次运行保持稳定", () => {
    const run = () =>
      finalizeJobs(
        [base({ jobType: "暑期实习" }), base({ jobType: "秋招" })],
        undefined,
        new Date("2026-08-24"),
      )
        .map((j) => `${j.jobType}:${j.id}`)
        .sort();
    expect(run()).toEqual(run());
  });
});
