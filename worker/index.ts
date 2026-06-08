interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  DEEPSEEK_API_KEY: string;
  ALLOWED_ORIGIN: string;
}

function cors(env: Env): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

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

skills 提取 5-15 个关键技能词。targetRoles 推断 3-5 个适合的岗位方向。strengths/weaknesses 各 2-4 条。只返回 JSON。`;

async function handleResumeParse(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as { text?: string };
  if (!body.text || body.text.length < 20) {
    return Response.json({ error: "简历文本太短" }, { status: 400, headers: cors(env) });
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
    return Response.json({ error: "AI 解析失败" }, { status: 502, headers: cors(env) });
  }

  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  const content = data.choices[0]?.message?.content ?? "{}";

  try {
    const jsonStr = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    return Response.json(parsed, { headers: cors(env) });
  } catch {
    return Response.json({ error: "解析结果格式异常", raw: content }, { status: 500, headers: cors(env) });
  }
}

async function handleOAuthExchange(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as { code?: string };
  if (!body.code) {
    return Response.json({ error: "missing code" }, { status: 400, headers: cors(env) });
  }

  const ghRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code: body.code,
    }),
  });

  const ghText = await ghRes.text();
  let data: { access_token?: string; error?: string; error_description?: string };
  try {
    data = JSON.parse(ghText);
  } catch {
    return Response.json({ error: "GitHub response parse failed", raw: ghText.slice(0, 200) }, { status: 502, headers: cors(env) });
  }
  if (data.error || !data.access_token) {
    return Response.json({ error: data.error ?? "token exchange failed", detail: data.error_description ?? "" }, { status: 401, headers: cors(env) });
  }

  return Response.json({ access_token: data.access_token }, { headers: cors(env) });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(env) });
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/resume/parse" && request.method === "POST") {
      return handleResumeParse(request, env);
    }

    if (url.pathname === "/api/oauth/exchange" && request.method === "POST") {
      return handleOAuthExchange(request, env);
    }

    return new Response("Not Found", { status: 404 });
  },
};
