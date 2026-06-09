import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import type { Job, JobsDiff } from "../lib/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mijzadmumnlrpvhaxwrm.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
const RESEND_KEY = process.env.RESEND_API_KEY || "";

if (!SUPABASE_KEY || !RESEND_KEY) {
  console.log("[notify] Missing SUPABASE_SERVICE_KEY or RESEND_API_KEY, skipping");
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface Profile {
  id: string;
  notify_email: string;
  skills: string[];
  target_roles: string[];
  categories: string[];
  cities: string[];
}

function norm(s: string) { return s.toLowerCase().replace(/[\s_\-]/g, ""); }

function matchJob(job: Job, profile: Profile): number {
  let score = 0;
  const text = norm([job.title, job.description ?? "", ...job.tags].join(" "));

  if (profile.skills.length > 0) {
    let hits = 0;
    for (const s of profile.skills) { if (text.includes(norm(s))) hits++; }
    score += 0.4 * Math.min(hits / Math.max(profile.skills.length * 0.2, 1), 1);
  }
  if (profile.target_roles.length > 0) {
    for (const r of profile.target_roles) { if (text.includes(norm(r))) { score += 0.3; break; } }
  }
  if (profile.categories.length > 0 && profile.categories.includes(job.category)) score += 0.15;
  if (profile.cities.length > 0 && job.location.some((l) => profile.cities.some((c) => l.includes(c)))) score += 0.15;

  return Math.min(1, score);
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
    body: JSON.stringify({
      from: "Career Search <notify@career-search.com>",
      to,
      subject,
      html,
    }),
  });
  return res.ok;
}

async function main() {
  const jobsRaw = fs.readFileSync(path.join(process.cwd(), "data/jobs.json"), "utf8");
  const jobs = JSON.parse(jobsRaw) as Job[];

  let diffRaw: string;
  try { diffRaw = fs.readFileSync(path.join(process.cwd(), "data/diff.json"), "utf8"); } catch { return; }
  const diff = JSON.parse(diffRaw) as JobsDiff;
  const newJobs = jobs.filter((j) => diff.newJobIds.includes(j.id));

  if (newJobs.length === 0) {
    console.log("[notify] No new jobs, skipping email");
    return;
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, notify_email, skills, target_roles, categories, cities")
    .eq("notify_enabled", true)
    .not("notify_email", "is", null);

  if (!profiles || profiles.length === 0) {
    console.log("[notify] No users with email notifications enabled");
    return;
  }

  console.log(`[notify] ${newJobs.length} new jobs, ${profiles.length} users to notify`);

  for (const profile of profiles as Profile[]) {
    const matched = newJobs
      .map((j) => ({ job: j, score: matchJob(j, profile) }))
      .filter((m) => m.score > 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    if (matched.length === 0) continue;

    const jobList = matched.map((m) =>
      `<tr><td style="padding:8px;border-bottom:1px solid #f0f0f0"><strong>${m.job.company}</strong> - ${m.job.title}</td><td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:center">${Math.round(m.score * 100)}%</td><td style="padding:8px;border-bottom:1px solid #f0f0f0"><a href="${m.job.applyUrl}" style="color:#5b4cff">投递</a></td></tr>`
    ).join("");

    const html = `
      <div style="max-width:600px;margin:0 auto;font-family:-apple-system,sans-serif">
        <h2 style="color:#1a1a2e">Career Search · 今日新增匹配岗位</h2>
        <p style="color:#6b7280">今日新增 ${newJobs.length} 个岗位，以下 ${matched.length} 个与你的画像匹配：</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr style="background:#f8f9fc"><th style="padding:8px;text-align:left">岗位</th><th style="padding:8px">匹配</th><th style="padding:8px">操作</th></tr>
          ${jobList}
        </table>
        <a href="https://career-search-ten.vercel.app" style="display:inline-block;padding:10px 20px;background:#5b4cff;color:white;text-decoration:none;border-radius:8px">查看全部岗位</a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">此邮件由 Career Search 自动发送。如需退订，请在画像设置中关闭推送。</p>
      </div>`;

    const ok = await sendEmail(profile.notify_email, `Career Search: 今日 ${matched.length} 个匹配岗位`, html);
    console.log(`[notify] ${profile.notify_email}: ${ok ? "sent" : "failed"}`);
  }
}

main().catch(console.error);
