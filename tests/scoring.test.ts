import { daysUntil, computeId, detectRegion, detectJobType, normalizeRaw } from "../lib/scoring";
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
