import { supabase } from "./supabase";

export interface EmailRecord {
  id: string;
  user_id: string;
  from_address: string;
  subject: string;
  received_at: string;
  body_preview: string;
  parsed_company: string | null;
  parsed_position: string | null;
  parsed_action: string;
  parsed_date: string | null;
  confidence: number;
  status: "pending" | "confirmed" | "dismissed";
  synced_tracking_id: string | null;
  created_at: string;
}

const DOMAIN = "career-search.com";

function generateCode(): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function getOrCreateInbox(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from("email_inboxes")
    .select("inbox_code")
    .eq("user_id", user.id)
    .single();

  if (existing) return `${existing.inbox_code}@${DOMAIN}`;

  const code = generateCode();
  const { error } = await supabase
    .from("email_inboxes")
    .insert({ user_id: user.id, inbox_code: code });

  if (error) return null;
  return `${code}@${DOMAIN}`;
}

export async function loadEmailRecords(): Promise<EmailRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("email_records")
    .select("*")
    .eq("user_id", user.id)
    .order("received_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data as EmailRecord[];
}

export async function loadPendingEmailRecords(): Promise<EmailRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("email_records")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .gte("confidence", 0.3)
    .order("received_at", { ascending: false });

  if (error || !data) return [];
  return data as EmailRecord[];
}

export async function confirmEmailRecord(id: string): Promise<void> {
  await supabase
    .from("email_records")
    .update({ status: "confirmed" })
    .eq("id", id);
}

export async function dismissEmailRecord(id: string): Promise<void> {
  await supabase
    .from("email_records")
    .update({ status: "dismissed" })
    .eq("id", id);
}

export const ACTION_LABELS: Record<string, { label: string; trackingStatus: string }> = {
  applied: { label: "投递确认", trackingStatus: "applied" },
  interview_invite: { label: "面试邀请", trackingStatus: "interview" },
  written_test: { label: "笔试通知", trackingStatus: "written" },
  offer: { label: "录用通知", trackingStatus: "offer" },
  rejection: { label: "拒信", trackingStatus: "rejected" },
  other: { label: "其他", trackingStatus: "applied" },
};
