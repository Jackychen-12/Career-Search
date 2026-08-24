/**
 * localStorage that can't take the page down.
 *
 * Safari in private mode throws on both getItem and setItem, and every browser
 * throws QuotaExceededError once the origin's quota is full. Tracking and
 * interview records write on every edit, so an unguarded setItem turns a full
 * quota into a silently failed save — or an unhandled exception on mount.
 */

export function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    // A corrupted or half-written entry shouldn't hand callers the wrong shape.
    if (Array.isArray(fallback) !== Array.isArray(parsed)) return fallback;
    if (parsed === null || typeof parsed !== "object") return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

/** Returns false when the write was rejected (private mode, quota full). */
export function writeJson(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** For plain string values that aren't JSON, e.g. the theme preference. */
export function readString(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeString(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
