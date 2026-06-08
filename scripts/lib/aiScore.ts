import { RESUME_KEYWORDS } from "../../config/resume.config";
import type { Job } from "../../lib/types";

const API_URL = "https://api.deepseek.com/chat/completions";
const API_KEY = process.env.DEEPSEEK_API_KEY ?? "";
const BATCH_SIZE = 20;

interface AiMatchResult {
  id: string;
  score: number;
  reason: string;
}

const PROFILE_PROMPT = `你是一个求职匹配专家。基于以下求职者画像，对每个岗位给出 0-100 的匹配分和一句话理由。

求职者画像：
- 目标岗位：${RESUME_KEYWORDS.targetRoles.join("、")}
- 核心技能：${RESUME_KEYWORDS.skills.join("、")}
- 目标行业：${(RESUME_KEYWORDS.targetCategories ?? []).join("、")}
- 偏好公司层级：Tier ${RESUME_KEYWORDS.targetCompanyTiers.join("/")}

请对以下岗位列表打分，返回 JSON 数组格式：[{"id":"岗位id","score":75,"reason":"一句话"}]
只返回 JSON，不要其他文字。`;

async function callDeepSeek(jobs: { id: string; text: string }[]): Promise<AiMatchResult[]> {
  const jobList = jobs.map((j) => `- [${j.id}] ${j.text}`).join("\n");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: PROFILE_PROMPT },
        { role: "user", content: `请对以下 ${jobs.length} 个岗位打分：\n${jobList}` },
      ],
      temperature: 0.1,
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  const content = data.choices[0]?.message?.content ?? "[]";

  try {
    const jsonStr = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr) as AiMatchResult[];
  } catch {
    console.warn("[ai-score] Failed to parse response, skipping batch");
    return [];
  }
}

export async function computeAiScores(jobs: Job[]): Promise<Map<string, { score: number; reason: string }>> {
  if (!API_KEY) {
    console.log("[ai-score] No DEEPSEEK_API_KEY, skipping AI scoring");
    return new Map();
  }

  console.log(`[ai-score] Scoring ${jobs.length} jobs with DeepSeek...`);
  const results = new Map<string, { score: number; reason: string }>();

  const batches: { id: string; text: string }[][] = [];
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    batches.push(
      jobs.slice(i, i + BATCH_SIZE).map((j) => ({
        id: j.id,
        text: `${j.company} | ${j.title} | ${j.category} | ${j.location.join("/")} | ${j.jobType}${j.description ? " | " + j.description.slice(0, 60) : ""}`,
      })),
    );
  }

  let processed = 0;
  for (const batch of batches) {
    try {
      const batchResults = await callDeepSeek(batch);
      for (const r of batchResults) {
        if (r.id && typeof r.score === "number") {
          results.set(r.id, { score: Math.min(100, Math.max(0, r.score)) / 100, reason: r.reason ?? "" });
        }
      }
      processed += batch.length;
      if (processed % 100 === 0) console.log(`[ai-score] ${processed}/${jobs.length} done`);
      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      console.warn(`[ai-score] Batch failed: ${(e as Error).message}`);
    }
  }

  console.log(`[ai-score] Done. ${results.size} jobs scored.`);
  return results;
}
