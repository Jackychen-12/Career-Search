export const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const DEFAULT_TIMEOUT = Number(process.env.CRAWL_TIMEOUT_MS || 25000);
const MAX_RETRIES = 2;

async function fetchWithRetry(url: string, init: RequestInit = {}, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT);
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "User-Agent": UA, ...(init.headers as Record<string, string>) },
        signal: ctrl.signal,
        redirect: "follow",
      });
      if (res.ok || res.status < 500 || attempt >= retries) {
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} <- ${url}`);
        return res;
      }
      console.warn(`[fetch] ${url} returned ${res.status}, retry ${attempt + 1}/${retries}`);
    } catch (err) {
      clearTimeout(timer);
      if (attempt >= retries) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("HTTP ") && !msg.includes("5")) throw err;
      console.warn(`[fetch] ${url} failed (${msg}), retry ${attempt + 1}/${retries}`);
    } finally {
      clearTimeout(timer);
    }
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
}

export async function getText(url: string, headers: Record<string, string> = {}): Promise<string> {
  const res = await fetchWithRetry(url, { headers });
  return res.text();
}

export async function getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetchWithRetry(url, { headers: { Accept: "application/json", ...headers } });
  return (await res.json()) as T;
}

export async function postJson<T>(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  const res = await fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

/** Strip HTML tags + decode common entities + collapse whitespace. */
export function stripHtml(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(s: string, max = 160): string {
  const t = s.trim();
  return t.length <= max ? t : t.slice(0, max).trimEnd() + "…";
}

/** Parse common date formats to ISO; null when unparseable. */
export function toIso(input: string | number | null | undefined): string | null {
  if (input == null || input === "") return null;
  if (typeof input === "number") {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(String(input).trim());
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
