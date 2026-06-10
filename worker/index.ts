interface Env {
  DEEPSEEK_API_KEY: string;
  ALLOWED_ORIGIN: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function isOriginAllowed(request: Request, env: Env): string | null {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = (env.ALLOWED_ORIGIN ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowed.length === 0) return null;
  if (allowed.includes(origin)) return origin;
  return null;
}

async function verifySupabaseJwt(request: Request, env: Env): Promise<boolean> {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return false;

  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_ANON_KEY,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function callDeepSeek(env: Env, headers: HeadersInit, system: string, user: string, maxTokens = 3000): Promise<Response> {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "system", content: system }, { role: "user", content: user.slice(0, 8000) }],
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) return Response.json({ error: "AI 调用失败" }, { status: 502, headers });

  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  const content = data.choices[0]?.message?.content ?? "";

  try {
    const jsonStr = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    return Response.json(JSON.parse(jsonStr), { headers });
  } catch {
    return Response.json({ content }, { headers });
  }
}

// ─── Skill: 简历解析 ───
const RESUME_PROMPT = `你是简历解析专家。提取结构化信息，返回 JSON：
{"school":"","major":"","degree":"本科|硕士|博士","skills":["技能1"...],"targetRoles":["方向1"...],"experience":["公司-岗位-简述"...],"strengths":["优势1"...],"weaknesses":["短板1"...],"summary":"一句话概括"}
skills 5-15个，targetRoles 3-5个。只返回 JSON。`;

// ─── Skill: 面试题定制 ───
const INTERVIEW_PROMPT = `你是一个资深面试官。根据候选人背景和目标岗位，生成针对性面试题。
返回 JSON：
{"questions":[{"question":"面试题","category":"技术|业务|行为|情景","difficulty":"简单|中等|困难","tips":"回答要点提示","sample":"参考答案要点"}]}
生成 8-10 道题，覆盖技术能力、业务理解、行为面试、情景模拟。题目要具体，不要泛泛而谈。`;

// ─── Skill: 简历润色 ───
const RESUME_POLISH_PROMPT = `你是简历优化专家。根据候选人的背景和目标岗位，对每段经历给出具体的润色建议。
返回 JSON：
{"suggestions":[{"original":"原始描述","improved":"优化后的描述","reason":"为什么这样改"}],"overall":"整体建议","keywords":["应该突出的关键词"],"score":75,"scoreReason":"评分理由"}
score 是当前简历对该岗位的匹配度(0-100)。建议要具体、可操作。用 STAR 法则优化经历描述。`;

// ─── Skill: 求职信生成 ───
const COVER_LETTER_PROMPT = `你是求职信写作专家。根据候选人画像和目标岗位，生成一封专业的中文求职信。
返回 JSON：
{"letter":"完整的求职信正文（400-600字）","highlights":["信中突出的3个核心卖点"],"tips":"投递注意事项"}
求职信要自然真诚，不要套话。开头要有亮点抓注意力。中间匹配岗位要求。结尾表达诚意。`;

// ─── Skill: Offer 对比分析 ───
const OFFER_COMPARE_PROMPT = `你是职业规划专家。帮候选人对比分析多个 Offer，给出最终建议。
返回 JSON：
{"comparison":[{"dimension":"维度（如薪资/发展空间/工作生活平衡）","analysis":"各Offer在这个维度的对比分析"}],"recommendation":"最终推荐哪个 Offer","reason":"推荐理由","risks":"需要注意的风险","negotiation":"谈薪建议"}
维度至少覆盖：薪资福利、发展空间、团队文化、城市生活、行业前景。分析要客观具体。`;

// ─── Skill: 面试记录 AI 解析 ───
const INTERVIEW_PARSE_PROMPT = `你是一个面试记录助手。从用户的自然语言描述中提取结构化面试信息。
返回 JSON：
{
  "company": "公司名",
  "position": "岗位名",
  "department": "部门（如有，否则null）",
  "round": "面试轮次（一面/二面/三面/HR面/终面）",
  "date": "面试日期 YYYY-MM-DD",
  "interviewer": "面试官姓名或描述（如有，否则null）",
  "duration": null,
  "questions": ["问题1", "问题2"],
  "myAnswers": null,
  "feeling": "好/一般/差",
  "feedback": "复盘要点（如有，否则null）",
  "nextPrepare": "下次准备事项（如有，否则null）",
  "result": "通过/待定/挂了",
  "salaryInfo": null,
  "notes": "其他补充信息（如有，否则null）"
}
规则：
- 未提及的字段填 null
- questions 尽量拆分为独立问题，即使用户只概括地提了
- duration 是分钟数（整数）或 null
- 如果用户说"感觉还行"之类的，feeling 填"一般"；"感觉不错/挺好"填"好"；"感觉凉了/不太好"填"差"
- result 如果用户没明确说通过或挂了，默认填"待定"
只返回 JSON，不要其他文字。`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = isOriginAllowed(request, env);
    if (!origin) {
      return new Response("Forbidden", { status: 403 });
    }

    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method !== "POST") {
      return new Response("Not Found", { status: 404, headers: cors });
    }

    const authenticated = await verifySupabaseJwt(request, env);
    if (!authenticated) {
      return Response.json({ error: "请先登录" }, { status: 401, headers: cors });
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return Response.json({ error: "请求体格式错误" }, { status: 400, headers: cors });
    }

    // 简历解析
    if (path === "/api/resume/parse") {
      if (!body.text || (body.text as string).length < 20) {
        return Response.json({ error: "简历文本太短" }, { status: 400, headers: cors });
      }
      return callDeepSeek(env, cors, RESUME_PROMPT, body.text as string, 2000);
    }

    // 面试题定制
    if (path === "/api/skill/interview") {
      const profile = body.profile as string ?? "";
      const job = body.job as string ?? "";
      return callDeepSeek(env, cors, INTERVIEW_PROMPT,
        `候选人背景：\n${profile}\n\n目标岗位：\n${job}`, 3000);
    }

    // 简历润色
    if (path === "/api/skill/resume-polish") {
      const profile = body.profile as string ?? "";
      const job = body.job as string ?? "";
      const experiences = body.experiences as string ?? "";
      return callDeepSeek(env, cors, RESUME_POLISH_PROMPT,
        `候选人画像：\n${profile}\n\n目标岗位：\n${job}\n\n现有经历描述：\n${experiences}`, 3000);
    }

    // 求职信生成
    if (path === "/api/skill/cover-letter") {
      const profile = body.profile as string ?? "";
      const job = body.job as string ?? "";
      return callDeepSeek(env, cors, COVER_LETTER_PROMPT,
        `候选人画像：\n${profile}\n\n目标岗位：\n${job}`, 2000);
    }

    // Offer 对比
    if (path === "/api/skill/offer-compare") {
      const profile = body.profile as string ?? "";
      const offers = body.offers as string ?? "";
      return callDeepSeek(env, cors, OFFER_COMPARE_PROMPT,
        `候选人背景：\n${profile}\n\n待对比的 Offer：\n${offers}`, 3000);
    }

    // 面试记录 AI 解析
    if (path === "/api/interview/parse") {
      const text = body.text as string ?? "";
      const today = body.today as string ?? new Date().toISOString().slice(0, 10);
      if (text.length < 5) {
        return Response.json({ error: "描述太短，请多写一些面试情况" }, { status: 400, headers: cors });
      }
      return callDeepSeek(env, cors, INTERVIEW_PARSE_PROMPT,
        `当前日期：${today}\n\n用户描述：\n${text}`, 2000);
    }

    return new Response("Not Found", { status: 404, headers: cors });
  },
};
