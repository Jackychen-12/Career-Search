/**
 * safeStorage guards browser-only APIs, so this suite needs a DOM.
 * The rest of the tests stay on the default node environment.
 *
 * @jest-environment jsdom
 */
import { readJson, writeJson, readString, writeString } from "../lib/safeStorage";

/** Swap in a localStorage that behaves like Safari private mode / a full quota. */
function useStorage(impl: Partial<Storage>) {
  Object.defineProperty(window, "localStorage", {
    value: impl as Storage,
    configurable: true,
    writable: true,
  });
}

const throwing: Partial<Storage> = {
  getItem: () => {
    throw new DOMException("The operation is insecure.", "SecurityError");
  },
  setItem: () => {
    throw new DOMException("QuotaExceededError", "QuotaExceededError");
  },
};

function memoryStorage(): Partial<Storage> {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

describe("safeStorage", () => {
  afterEach(() => {
    useStorage(memoryStorage());
  });

  test("localStorage 抛异常时读取返回兜底值而不是崩溃", () => {
    useStorage(throwing);
    expect(readJson("k", { a: 1 })).toEqual({ a: 1 });
    expect(readJson("k", [])).toEqual([]);
    expect(readString("theme")).toBeNull();
  });

  test("localStorage 抛异常时写入返回 false 而不是抛出", () => {
    useStorage(throwing);
    expect(writeJson("k", { a: 1 })).toBe(false);
    expect(writeString("theme", "dark")).toBe(false);
  });

  test("正常情况下读写往返一致", () => {
    useStorage(memoryStorage());
    expect(writeJson("k", { a: 1 })).toBe(true);
    expect(readJson("k", {})).toEqual({ a: 1 });
    expect(writeString("theme", "dark")).toBe(true);
    expect(readString("theme")).toBe("dark");
  });

  test("损坏的 JSON 返回兜底值", () => {
    const s = memoryStorage();
    useStorage(s);
    s.setItem!("k", "{not json");
    expect(readJson("k", { a: 1 })).toEqual({ a: 1 });
  });

  test("存的类型和兜底类型不一致时返回兜底值", () => {
    const s = memoryStorage();
    useStorage(s);
    // 期望数组却存了对象，直接返回会让调用方拿到错误结构
    s.setItem!("arr", JSON.stringify({ a: 1 }));
    expect(readJson("arr", [])).toEqual([]);
    // 期望对象却存了数组
    s.setItem!("obj", JSON.stringify([1, 2]));
    expect(readJson("obj", {})).toEqual({});
    // 期望对象却存了标量
    s.setItem!("scalar", JSON.stringify("hi"));
    expect(readJson("scalar", {})).toEqual({});
  });

  test("键不存在时返回兜底值", () => {
    useStorage(memoryStorage());
    expect(readJson("missing", { a: 1 })).toEqual({ a: 1 });
    expect(readString("missing")).toBeNull();
  });
});
