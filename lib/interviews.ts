import { supabase } from "./supabase";

export interface InterviewRound {
  id: string;
  round: string;
  date: string;
  interviewer?: string;
  duration?: number;
  questions: string[];
  myAnswers?: string[];
  feeling: "好" | "一般" | "差" | "";
  feedback?: string;
  nextPrepare?: string;
  result: "通过" | "待定" | "挂了" | "";
}

export type InterviewStatus = "进行中" | "已拿offer" | "已拒" | "已放弃";

export interface InterviewRecord {
  id: string;
  company: string;
  position: string;
  department?: string;
  channel?: string;
  status: InterviewStatus;
  rounds: InterviewRound[];
  salaryInfo?: string;
  offerDetail?: string;
  nextInterviewAt?: string;
  nextPrepare?: string;
  notes?: string;
  relatedJobId?: string;
  createdAt: string;
  updatedAt: string;
}

const CACHE_KEY = "career-search:interviews";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getCache(): InterviewRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setCache(data: InterviewRecord[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  }
}

export async function loadInterviews(): Promise<InterviewRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return getCache();

  const { data, error } = await supabase
    .from("interviews")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error || !data) return getCache();

  const records: InterviewRecord[] = data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    company: row.company as string,
    position: row.position as string,
    department: (row.department as string) ?? undefined,
    channel: (row.channel as string) ?? undefined,
    status: row.status as InterviewStatus,
    rounds: (row.rounds as InterviewRound[]) ?? [],
    salaryInfo: (row.salary_info as string) ?? undefined,
    offerDetail: (row.offer_detail as string) ?? undefined,
    nextInterviewAt: (row.next_interview_at as string) ?? undefined,
    nextPrepare: (row.next_prepare as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    relatedJobId: (row.related_job_id as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));

  setCache(records);
  return records;
}

export async function saveInterview(record: Omit<InterviewRecord, "id" | "createdAt" | "updatedAt">): Promise<InterviewRecord[]> {
  const now = new Date().toISOString();
  const newRecord: InterviewRecord = {
    ...record,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  const data = getCache();
  data.unshift(newRecord);
  setCache(data);

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("interviews").insert({
      id: newRecord.id,
      user_id: user.id,
      company: newRecord.company,
      position: newRecord.position,
      department: newRecord.department ?? null,
      channel: newRecord.channel ?? null,
      status: newRecord.status,
      rounds: newRecord.rounds,
      salary_info: newRecord.salaryInfo ?? null,
      offer_detail: newRecord.offerDetail ?? null,
      next_interview_at: newRecord.nextInterviewAt ?? null,
      next_prepare: newRecord.nextPrepare ?? null,
      notes: newRecord.notes ?? null,
      related_job_id: newRecord.relatedJobId ?? null,
      created_at: newRecord.createdAt,
      updated_at: newRecord.updatedAt,
    });
  }

  return data;
}

export async function updateInterview(id: string, patch: Partial<Omit<InterviewRecord, "id" | "createdAt">>): Promise<InterviewRecord[]> {
  const data = getCache();
  const idx = data.findIndex((r) => r.id === id);
  if (idx === -1) return data;

  const now = new Date().toISOString();
  data[idx] = { ...data[idx], ...patch, updatedAt: now };
  setCache(data);

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const row: Record<string, unknown> = { updated_at: now };
    if (patch.company !== undefined) row.company = patch.company;
    if (patch.position !== undefined) row.position = patch.position;
    if (patch.department !== undefined) row.department = patch.department ?? null;
    if (patch.channel !== undefined) row.channel = patch.channel ?? null;
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.rounds !== undefined) row.rounds = patch.rounds;
    if (patch.salaryInfo !== undefined) row.salary_info = patch.salaryInfo ?? null;
    if (patch.offerDetail !== undefined) row.offer_detail = patch.offerDetail ?? null;
    if (patch.nextInterviewAt !== undefined) row.next_interview_at = patch.nextInterviewAt ?? null;
    if (patch.nextPrepare !== undefined) row.next_prepare = patch.nextPrepare ?? null;
    if (patch.notes !== undefined) row.notes = patch.notes ?? null;
    if (patch.relatedJobId !== undefined) row.related_job_id = patch.relatedJobId ?? null;
    await supabase.from("interviews").update(row).eq("id", id).eq("user_id", user.id);
  }

  return data;
}

export async function deleteInterview(id: string): Promise<InterviewRecord[]> {
  let data = getCache();
  data = data.filter((r) => r.id !== id);
  setCache(data);

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("interviews").delete().eq("id", id).eq("user_id", user.id);
  }

  return data;
}

export function createEmptyRound(): InterviewRound {
  return {
    id: generateId(),
    round: "",
    date: new Date().toISOString().slice(0, 10),
    questions: [],
    feeling: "",
    result: "",
  };
}
