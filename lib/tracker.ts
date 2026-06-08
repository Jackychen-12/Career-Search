import { getToken } from "./auth";

export type TrackingStatus = "saved" | "applied" | "written" | "interview" | "hr" | "offer" | "rejected" | "withdrawn";

export interface TrackingEntry {
  status: TrackingStatus;
  updatedAt: string;
  appliedAt?: string;
  interviewAt?: string;
  offerAt?: string;
  notes?: string;
  channel?: string;
  contact?: string;
  salary?: string;
  priority?: "high" | "medium" | "low";
}

export type TrackingData = Record<string, TrackingEntry>;

const CACHE_KEY = "career-search:tracking";
const GIST_FILENAME = "career-search-tracking.json";

let gistId: string | null = null;

function getCache(): TrackingData {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setCache(data: TrackingData) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

async function findOrCreateGist(token: string): Promise<string> {
  if (gistId) return gistId;

  const res = await fetch("https://api.github.com/gists?per_page=100", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to list gists");
  const gists = (await res.json()) as { id: string; files: Record<string, unknown> }[];
  const existing = gists.find((g) => GIST_FILENAME in g.files);
  if (existing) {
    gistId = existing.id;
    return gistId;
  }

  const createRes = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      description: "Career-Search tracking data",
      public: false,
      files: { [GIST_FILENAME]: { content: "{}" } },
    }),
  });
  if (!createRes.ok) throw new Error("Failed to create gist");
  const created = (await createRes.json()) as { id: string };
  gistId = created.id;
  return gistId;
}

export async function loadTracking(): Promise<TrackingData> {
  const token = getToken();
  if (!token) return getCache();

  try {
    const id = await findOrCreateGist(token);
    const res = await fetch(`https://api.github.com/gists/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return getCache();
    const gist = (await res.json()) as { files: Record<string, { content: string }> };
    const content = gist.files[GIST_FILENAME]?.content ?? "{}";
    const data = JSON.parse(content) as TrackingData;
    setCache(data);
    return data;
  } catch {
    return getCache();
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export async function saveTracking(jobId: string, status: TrackingStatus, extra?: Partial<TrackingEntry>): Promise<TrackingData> {
  const data = getCache();
  data[jobId] = { ...data[jobId], ...extra, status, updatedAt: new Date().toISOString() };
  setCache(data);

  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => syncToGist(data), 1500);

  return data;
}

export async function removeTracking(jobId: string): Promise<TrackingData> {
  const data = getCache();
  delete data[jobId];
  setCache(data);

  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => syncToGist(data), 1500);

  return data;
}

async function syncToGist(data: TrackingData) {
  const token = getToken();
  if (!token) return;
  try {
    const id = await findOrCreateGist(token);
    await fetch(`https://api.github.com/gists/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        files: { [GIST_FILENAME]: { content: JSON.stringify(data, null, 2) } },
      }),
    });
  } catch {
    // silent — local cache is still valid
  }
}
