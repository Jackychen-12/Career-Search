interface Env {
  DEEPSEEK_API_KEY: string;
}

const CORS_HEADERS: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const RESUME_PROMPT = `你是一个简历解析专家。分析以下简历文本，提取结构化信息。返回 JSON 格式：
{
  "school": "学校名称",
  "major": "专业",
  "degree": "本科|硕士|博士",
  "skills": ["技能1", "技能2", ...],
  "targetRoles": ["适合的岗位方向1", "方向2", ...],
  "experience": ["公司-岗位-简述", ...],
  "strengths": ["优势1", "优势2", ...],
  "weaknesses": ["可能的短板1", ...],
  "summary": "一句话概括这位候选人"
}

skills 提取 5-15 个关键技能词。targetRoles 推断 3-5 个适合的岗位方向。只返回 JSON。`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/resume/parse" && request.method === "POST") {
      const body = (await request.json()) as { text?: string };
      if (!body.text || body.text.length < 20) {
        return Response.json({ error: "简历文本太短" }, { status: 400, headers: CORS_HEADERS });
      }

      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: RESUME_PROMPT },
            { role: "user", content: body.text.slice(0, 8000) },
          ],
          temperature: 0.1,
          max_tokens: 2000,
        }),
      });

      if (!res.ok) {
        return Response.json({ error: "AI 解析失败" }, { status: 502, headers: CORS_HEADERS });
      }

      const data = (await res.json()) as { choices: { message: { content: string } }[] };
      const content = data.choices[0]?.message?.content ?? "{}";

      try {
        const jsonStr = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
        return Response.json(JSON.parse(jsonStr), { headers: CORS_HEADERS });
      } catch {
        return Response.json({ error: "解析结果格式异常" }, { status: 500, headers: CORS_HEADERS });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
};
