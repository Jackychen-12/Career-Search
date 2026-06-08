import { supabase } from "./supabase";

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

function getCache(): TrackingData {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function setCache(data: TrackingData) {
  if (typeof window !== "undefined") {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  }
}

export async function loadTracking(): Promise<TrackingData> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return getCache();

  const { data, error } = await supabase
    .from("tracking")
    .select("*")
    .eq("user_id", user.id);

  if (error || !data) return getCache();

  const result: TrackingData = {};
  for (const row of data) {
    result[row.job_id] = {
      status: row.status as TrackingStatus,
      updatedAt: row.updated_at,
      appliedAt: row.applied_at ?? undefined,
      interviewAt: row.interview_at ?? undefined,
      offerAt: row.offer_at ?? undefined,
      notes: row.notes ?? undefined,
      channel: row.channel ?? undefined,
      contact: row.contact ?? undefined,
      salary: row.salary ?? undefined,
      priority: row.priority as TrackingEntry["priority"] ?? undefined,
    };
  }
  setCache(result);
  return result;
}

export async function saveTracking(jobId: string, status: TrackingStatus, extra?: Partial<TrackingEntry>): Promise<TrackingData> {
  const data = getCache();
  const entry: TrackingEntry = { ...data[jobId], ...extra, status, updatedAt: new Date().toISOString() };
  data[jobId] = entry;
  setCache(data);

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("tracking").upsert({
      user_id: user.id,
      job_id: jobId,
      status,
      priority: entry.priority ?? null,
      applied_at: entry.appliedAt ?? null,
      interview_at: entry.interviewAt ?? null,
      offer_at: entry.offerAt ?? null,
      channel: entry.channel ?? null,
      contact: entry.contact ?? null,
      salary: entry.salary ?? null,
      notes: entry.notes ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,job_id" });

    await updateJobStats(jobId, status);
  }

  return data;
}

export async function removeTracking(jobId: string): Promise<TrackingData> {
  const data = getCache();
  delete data[jobId];
  setCache(data);

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("tracking").delete().eq("user_id", user.id).eq("job_id", jobId);
  }

  return data;
}

async function updateJobStats(jobId: string, status: TrackingStatus) {
  const field = status === "saved" ? "save_count" : status === "applied" ? "apply_count" : null;
  if (!field) return;

  const { data } = await supabase.from("job_stats").select("*").eq("job_id", jobId).single();
  if (data) {
    await supabase.from("job_stats").update({ [field]: (data[field] ?? 0) + 1, updated_at: new Date().toISOString() }).eq("job_id", jobId);
  } else {
    await supabase.from("job_stats").insert({ job_id: jobId, [field]: 1 });
  }
}
