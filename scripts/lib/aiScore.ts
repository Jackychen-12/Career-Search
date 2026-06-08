import type { Job, JobAiTags } from "../../lib/types";

const API_URL = "https://api.deepseek.com/chat/completions";
const API_KEY = process.env.DEEPSEEK_API_KEY ?? "";
const BATCH_SIZE = 15;

const SYSTEM_PROMPT = `你是一个岗位信息结构化专家。对每个岗位提取以下属性，返回 JSON 数组。

每个对象格式：
{
  "id": "岗位id",
  "skills": ["需要的技能1", "技能2", ...],
  "roleType": "产品|技术|数据|金融|管培|运营|设计|研究|工程|销售|其他",
  "industry": "互联网|金融|央国企|外企|快消|制造|咨询|地产|能源|其他",
  "seniority": "实习|应届|社招",
  "summary": "一句话概括这个岗位适合什么样的人"
}

skills 字段提取 3-8 个关键技能词（如 Python、数据分析、用户研究、财务建模等）。
只返回 JSON 数组，不要其他文字。`;

async function callDeepSeek(jobs: { id: string; text: string }[]): Promise<(JobAiTags & { id: string })[]> {
  const jobList = jobs.map((j) => `[${j.id}] ${j.text}`).join("\n");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `请分析以下 ${jobs.length} 个岗位：\n${jobList}` },
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
    return JSON.parse(jsonStr);
  } catch {
    console.warn("[ai-tags] Failed to parse response, skipping batch");
    return [];
  }
}

export async function extractAiTags(jobs: Job[]): Promise<Map<string, JobAiTags>> {
  if (!API_KEY) {
    console.log("[ai-tags] No DEEPSEEK_API_KEY, skipping AI tag extraction");
    return new Map();
  }

  console.log(`[ai-tags] Extracting tags for ${jobs.length} jobs with DeepSeek...`);
  const results = new Map<string, JobAiTags>();

  const batches: { id: string; text: string }[][] = [];
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    batches.push(
      jobs.slice(i, i + BATCH_SIZE).map((j) => ({
        id: j.id,
        text: `${j.company} | ${j.title} | ${j.category} | ${j.location.join("/")} | ${j.jobType}${j.description ? " | " + j.description.slice(0, 80) : ""}`,
      })),
    );
  }

  let processed = 0;
  for (const batch of batches) {
    try {
      const batchResults = await callDeepSeek(batch);
      for (const r of batchResults) {
        if (r.id && Array.isArray(r.skills)) {
          results.set(r.id, {
            skills: r.skills,
            roleType: r.roleType ?? "其他",
            industry: r.industry ?? "其他",
            seniority: r.seniority ?? "应届",
            summary: r.summary ?? "",
          });
        }
      }
      processed += batch.length;
      if (processed % 60 === 0) console.log(`[ai-tags] ${processed}/${jobs.length} done`);
      await new Promise((r) => setTimeout(r, 300));
    } catch (e) {
      console.warn(`[ai-tags] Batch failed: ${(e as Error).message}`);
    }
  }

  console.log(`[ai-tags] Done. ${results.size} jobs tagged.`);
  return results;
}
