interface Env {
  DEEPSEEK_API_KEY: string;
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

function isOriginAllowed(request: Request): string {
  return request.headers.get("Origin") || "*";
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
    return Response.json({ error: "AI 返回格式异常，请重试", content }, { status: 502, headers });
  }
}

// ─── Skill: 简历解析 ───
const RESUME_PROMPT = `你是简历解析专家。从简历中提取结构化信息，特别注意完整提取每段实习/工作经历的细节。
返回 JSON：
{
  "school": "学校名",
  "major": "专业",
  "degree": "本科|硕士|博士",
  "skills": ["技能1", "技能2"],
  "targetRoles": ["目标岗位方向1"],
  "experiences": [
    {
      "company": "公司名",
      "role": "岗位名称",
      "department": "部门（如有，否则null）",
      "industry": "所属行业（互联网/金融/快消/咨询等）",
      "duration": "起止时间（如 2025.03 - 2025.09）",
      "skills": ["该段经历用到的具体技能"],
      "highlights": ["量化成果1（如 用户增长10%）", "量化成果2"],
      "description": "完整工作内容描述（50-150字，STAR格式）"
    }
  ],
  "strengths": ["优势1"],
  "weaknesses": ["短板1"],
  "summary": "一句话概括候选人画像"
}
规则：
- skills 提取 5-15 个核心技能
- targetRoles 3-5 个目标方向
- experiences 必须提取简历中每一段实习/工作/项目经历，不要遗漏
- 每段 experience 的 skills 只填该段经历实际用到的技能（3-8个）
- highlights 提取量化数据（数字/百分比/规模），没有则填核心职责
- industry 从以下选择：互联网/金融/外企/快消/咨询/教育/医疗/制造/其他
- 如果简历中没有明确的实习经历，从项目经历/课题研究中提取
只返回 JSON。`;

// ─── Skill: 面试题定制 ───
const INTERVIEW_PROMPT = `你是一个资深面试官。根据候选人背景和目标岗位，生成针对性面试题。
返回 JSON：
{"questions":[{"question":"面试题","category":"技术|业务|行为|情景","difficulty":"简单|中等|困难","tips":"回答要点提示（50-100字）","sample":"参考答案要点（100-200字，结构化回答）"}]}
生成 8-10 道题，覆盖技术能力、业务理解、行为面试、情景模拟。题目要具体，不要泛泛而谈。sample 必须是详细的参考答案，不是简单提示。`;

// ─── Skill: 面试题追问 ───
const INTERVIEW_FOLLOWUP_PROMPT = `你是一个资深面试官。根据候选人背景、已有面试题和用户追问，生成新的针对性面试题。
不要重复已有题目。返回 JSON：
{"questions":[{"question":"面试题","category":"技术|业务|行为|情景","difficulty":"简单|中等|困难","tips":"回答要点提示（50-100字）","sample":"参考答案要点（100-200字，结构化回答）"}]}
生成 3-5 道新题，紧扣用户追问方向。sample 必须是详细的参考答案。`;

// ─── Skill: 简历润色 ───
const RESUME_POLISH_PROMPT = `你是简历优化专家。根据候选人的背景和目标岗位，对每段经历给出具体的润色建议。
返回 JSON：
{"suggestions":[{"original":"原始描述","improved":"优化后的描述","reason":"为什么这样改"}],"overall":"整体建议","keywords":["应该突出的关键词"],"score":75,"scoreReason":"评分理由"}
score 是当前简历对该岗位的匹配度(0-100)。建议要具体、可操作。用 STAR 法则优化经历描述。`;

// ─── Skill: 简历优化（合并版+方向建议）───
const RESUME_OPTIMIZE_PROMPT = `你是简历优化专家。根据候选人背景、目标岗位 JD 和原始简历/经历，完成三件事：
1. 逐句分析原始简历中的每段经历描述，对每个有改进空间的描述给出精确的 before/after 改写建议
2. 生成该岗位方向的技能建议和常见错误提醒
3. 生成一份格式化的原始简历（resumeOriginal）和一份优化后的完整简历（resume）

返回 JSON：
{
  "originalScore": 68,
  "optimizedScore": 92,
  "suggestions": [
    {
      "id": 1,
      "section": "实习经历",
      "title": "量化实习成果",
      "impact": "+3pp",
      "tags": ["STAR法则", "量化+2"],
      "original": "负责数据分析工作，完成报表",
      "improved": "独立完成 Python + SQL 量化分析项目：用 pandas 清洗 30 万行数据，构建用户流失预测模型（准确率 87%），推动运营策略调整后留存率提升 12%",
      "reason": "JD 要求数据分析能力，原描述过于笼统，缺少技术栈、数据规模和量化成果"
    }
  ],
  "resumeOriginal": {
    "sections": [
      {"title": "求职意向", "content": "原始内容（从候选人信息整理）"},
      {"title": "教育背景", "content": "学校 · 专业 · 学历"},
      {"title": "核心技能", "content": "原始技能列表"},
      {"title": "实习经历", "content": "原始经历描述（逐条保留原文）"},
      {"title": "项目经历", "content": "原始项目描述"},
      {"title": "自我评价", "content": "原始评价"}
    ]
  },
  "resume": {
    "sections": [
      {"title": "求职意向", "content": "优化后的岗位 | 城市"},
      {"title": "教育背景", "content": "学校 · 专业 · 学历\\n相关课程：..."},
      {"title": "核心技能", "content": "按 JD 匹配度排序，用 / 分隔"},
      {"title": "实习经历", "content": "每段用 STAR 法则重写，含公司·岗位·时间·详细描述·量化成果"},
      {"title": "项目经历", "content": "用 STAR 法则重写"},
      {"title": "证书 & 荣誉", "content": "如有"},
      {"title": "自我评价", "content": "紧扣 JD 的 2-3 句话"}
    ]
  },
  "directionAdvice": {
    "skillsRequired": ["该方向必备技能1", "必备技能2", "...8-12个"],
    "skillsBonus": ["加分技能1", "...3-5个"],
    "keyMetrics": ["该方向简历应突出的量化指标，如DAU/转化率/GMV"],
    "commonMistakes": ["该方向简历常见错误1", "错误2", "错误3"]
  },
  "keywords": ["ATS 关键词"],
  "tips": "投递建议"
}
规则：
- suggestions 必须逐句分析原始简历，original 是从原始简历中提取的实际文字
- suggestions 按影响分数（impact）降序排列，impact 格式为 "+Npp"
- section 字段标明该建议属于简历哪个段落（如"实习经历"/"技能"/"教育背景"）
- improved 必须包含具体技术细节、时间范围、数据规模、量化百分比
- tags 是该建议涉及的维度（如 "关键词+2"/"匹配度+5"/"ATS优化"/"STAR法则"）
- resumeOriginal 是可选的，如果 token 不足可以省略（前端有 fallback）
- resume 是必须的，一定要返回优化后的完整简历
- 实习经历的 content 格式：公司 | 岗位 | 部门 | 时间\\n- 具体成果1\\n- 具体成果2（多段经历之间用空行分隔）
- directionAdvice 基于目标岗位方向给出技能建议和常见错误
- 生成 6-10 条 suggestions，覆盖经历/技能/教育/评价等多个段落
只返回 JSON。`;

// ─── Skill: 求职信生成 ───
const COVER_LETTER_PROMPT = `你是求职信写作专家。根据候选人画像和目标岗位，生成一封专业的中文求职信。
返回 JSON：
{"letter":"完整的求职信正文（400-600字）","highlights":["信中突出的3个核心卖点"],"tips":"投递注意事项"}
求职信要自然真诚，不要套话。开头要有亮点抓注意力。中间匹配岗位要求。结尾表达诚意。`;

// ─── Skill: 求职信修改 ───
const COVER_LETTER_REFINE_PROMPT = `你是求职信写作专家。你将收到一封已有的求职信、候选人画像、目标岗位信息，以及用户的修改指令。
请根据修改指令对求职信进行针对性修改，保留原信中好的部分，只改用户要求改的地方。
返回 JSON：
{"letter":"修改后的完整求职信正文（400-600字）","highlights":["修改后信中突出的3个核心卖点"],"tips":"投递注意事项","changes":"本次修改了哪些内容（一句话概括）"}
规则：
- 必须返回完整的修改后求职信，不是 diff
- 保持自然真诚的语气
- changes 字段简要说明这次修改了什么
只返回 JSON。`;

// ─── Skill: 简历修改 ───
const RESUME_REFINE_PROMPT = `你是简历优化专家。你将收到一份已有的简历内容（分段格式）、候选人画像、目标岗位信息，以及用户的修改指令。
请根据修改指令对简历进行针对性修改，保留原简历中好的部分，只改用户要求改的地方。
返回 JSON：
{"sections":[{"title":"段落标题","content":"修改后的段落内容"}],"changes":"本次修改了哪些内容（一句话概括）"}
规则：
- 必须返回完整的修改后简历（所有段落），不是 diff
- 保持专业简洁的语言
- 段落标题和顺序与原简历一致
- changes 字段简要说明这次修改了什么
只返回 JSON。`;
const OFFER_COMPARE_PROMPT = `你是职业规划专家。帮候选人对比分析多个 Offer，给出最终建议。
返回 JSON：
{"comparison":[{"dimension":"维度（如薪资/发展空间/工作生活平衡）","analysis":"各Offer在这个维度的对比分析"}],"recommendation":"最终推荐哪个 Offer","reason":"推荐理由","risks":"需要注意的风险","negotiation":"谈薪建议"}
维度至少覆盖：薪资福利、发展空间、团队文化、城市生活、行业前景。分析要客观具体。`;

// ─── Skill: JD 匹配分析 ───
const JD_MATCH_PROMPT = `你是简历与岗位匹配分析专家。根据候选人画像和目标岗位 JD，进行深度匹配分析。
返回 JSON：
{
  "matchScore": 78,
  "modules": [
    {"name":"技能匹配","score":85,"matched":["匹配的技能"],"missing":["缺失的技能"]},
    {"name":"经历相关度","score":70,"matched":["匹配的经历要点"],"missing":["缺失的经历"]},
    {"name":"学历匹配","score":90,"matched":["匹配项"],"missing":[]},
    {"name":"方向契合","score":65,"matched":["匹配的方向"],"missing":["缺失的方向"]}
  ],
  "jdKeywords": ["JD中所有关键技能和要求词，10-20个"],
  "matchedKeywords": ["候选人已具备的关键词"],
  "suggestions": ["具体的优化建议1","建议2","建议3"]
}
规则：
- matchScore 是综合匹配度(0-100)，基于四个模块加权计算
- modules 必须包含以上四个维度，每个 score 都是 0-100
- jdKeywords 从 JD 中提取所有关键技能/要求/资质词
- matchedKeywords 是 jdKeywords 中候选人已具备的
- suggestions 给出 3-5 条具体、可操作的改进建议
只返回 JSON。`;

// ─── Skill: 一键定制简历 ───
const CUSTOM_RESUME_PROMPT = `你是简历定制专家。根据候选人背景和目标岗位 JD，生成一份针对该岗位定制的简历。
返回 JSON：
{
  "sections": [
    {"title":"求职意向","content":"定制后的内容"},
    {"title":"教育背景","content":"突出与岗位相关的课程和成绩"},
    {"title":"核心技能","content":"按JD匹配度排序的技能列表，用 / 分隔"},
    {"title":"项目经历","content":"用STAR法则重写，突出与JD匹配的成果"},
    {"title":"实习经历","content":"用STAR法则重写，强调量化成果"},
    {"title":"自我评价","content":"紧扣JD的2-3句话"}
  ],
  "highlights": ["本次定制的3个核心调整点"],
  "keywordCoverage": 85,
  "tips": "投递时的注意事项"
}
规则：
- 内容要基于候选人真实背景，不能凭空捏造经历
- 每段经历用 STAR 法则重写，量化成果
- 技能栏按 JD 关键词匹配度降序排列
- keywordCoverage 是 JD 关键词覆盖率(0-100)
- sections 中的内容可以有换行符表示多段
只返回 JSON。`;

// ─── Skill: 多 JD 对比排序 ───
const JD_COMPARE_PROMPT = `你是职业规划专家。根据候选人画像和多个目标岗位 JD，分析匹配度并给出投递优先级排序。
返回 JSON：
{
  "rankings": [
    {"rank":1,"company":"公司名","position":"岗位名","score":85,"strengths":["优势1","优势2"],"weaknesses":["劣势1"],"priority":"高"},
    {"rank":2,"company":"公司名","position":"岗位名","score":72,"strengths":["优势"],"weaknesses":["劣势"],"priority":"中"}
  ],
  "strategy": "综合投递策略建议（100-200字）",
  "timeline": "时间规划建议"
}
规则：
- rankings 按 score 降序排列，score 是 0-100 的匹配度
- priority 只能是 "高"/"中"/"低"
- strengths/weaknesses 各 1-3 条，要具体
- strategy 要给出冲刺/稳妥/保底的分层建议
- timeline 考虑各岗位截止日期给出时间安排
- 每个 JD 用 --- 分隔
只返回 JSON。`;

// ─── Skill: 方向模版参考 ───
const DIRECTION_TEMPLATE_PROMPT = `你是资深职业顾问。根据候选人背景和目标求职方向，生成一份该方向的简历模版和策略建议。
返回 JSON：
{
  "direction": "方向名称（如：AI产品经理）",
  "overview": "该方向简述+市场情况（50-100字）",
  "template": {
    "objective": "求职意向模版文案",
    "skillsRequired": ["必备技能1","必备技能2","...8-12个"],
    "skillsBonus": ["加分技能1","加分技能2","...3-5个"],
    "experienceTemplate": [
      {"type":"实习经历","example":"STAR法则示例描述，150字以内"},
      {"type":"项目经历","example":"STAR法则示例描述，150字以内"},
      {"type":"竞赛/论文","example":"示例描述"}
    ],
    "educationFocus": "该方向看重的学历/课程/证书",
    "selfIntro": "自我评价模版（80-120字）"
  },
  "keyMetrics": ["该方向简历应突出的3-5个量化指标，如DAU/转化率/GMV"],
  "commonMistakes": ["该方向简历常见错误1","错误2","错误3"],
  "interviewFocus": ["该方向面试重点考察1","考察2","考察3"],
  "relatedDirections": ["相近方向1","相近方向2"]
}
规则：
- 必须基于候选人的真实背景给出适配建议
- skillsRequired 和 skillsBonus 要区分清楚
- experienceTemplate 的 example 要用 STAR 法则，有量化数据
- commonMistakes 要具体，不要泛泛而谈
- 模版内容要可以直接参考使用
只返回 JSON。`;

// ─── Skill: 投递进展 AI 分析 ───
const PROGRESS_ANALYZE_PROMPT = `你是求职数据分析专家。根据候选人的求职进展数据，给出深度分析和建议。
返回 JSON：
{
  "summary": "一句话总结当前求职状态（20-40字）",
  "insights": ["数据洞察1", "数据洞察2", "数据洞察3"],
  "suggestions": ["行动建议1", "行动建议2", "行动建议3"],
  "riskWarnings": ["风险提醒（如有，否则空数组）"],
  "weeklyPlan": "下周行动建议（50-100字）"
}
规则：
- summary 简洁有力，突出最重要的发现
- insights 基于数据给出 3 条洞察，要有数据支撑
- suggestions 给出 3 条具体、可操作的建议
- riskWarnings 只在有明显风险时才填（如转化率过低、投递量不足等）
- weeklyPlan 给出下周具体的每日行动建议
只返回 JSON。`;


// ─── Skill: AI 求职教练 ───
const COACH_PROMPT = `你是一名资深求职策略教练。根据候选人的完整求职数据（画像、投递记录、面试记录、新岗位），给出精准的今日行动建议。

分析维度：
1. 紧急事项：即将到来的面试/截止日期，需要立即准备的
2. 数据洞察：投递转化率、各方向成功率、薪资趋势
3. 推荐投递：匹配度高的新岗位
4. 周计划：本周应该重点做什么

返回 JSON：
{
  "urgent": [{"title": "事项", "reason": "原因", "action": "建议行动", "daysLeft": 3}],
  "insights": [{"metric": "指标名", "value": "数值", "trend": "up/down/flat", "suggestion": "建议"}],
  "recommended": [{"company": "公司", "title": "岗位", "matchScore": 85, "reason": "匹配原因"}],
  "funnel": {"applied": 0, "written": 0, "interview": 0, "offer": 0},
  "weeklyPlan": "本周行动计划（3-5 条具体待办）",
  "oneLineSummary": "一句话总结当前求职状态"
}
规则：
- urgent 只列真正紧急的（3 天内面试/截止），没有就返回空数组
- insights 基于数据给 2-3 条洞察，要有数据支撑
- recommended 最多 3 个，matchScore 基于候选人画像和岗位匹配度
- funnel 从投递数据统计各阶段人数
- weeklyPlan 给出具体可执行的行动
只返回 JSON。`;

// ─── Skill: 面试记录 AI 解析 ───
const INTERVIEW_PARSE_PROMPT = `你是一个面试记录助手。从用户的自然语言描述中提取结构化面试信息。
返回 JSON：
{
  "company": "公司名（母公司/集团名）",
  "position": "岗位名",
  "department": "业务线/子品牌/部门（如有，否则null）",
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
- company 填母公司或集团名；department 填具体业务线、子品牌或部门
  示例："微信支付产品经理" → company="腾讯", department="微信支付", position="产品经理"
  示例："字节跳动飞书后端" → company="字节跳动", department="飞书", position="后端开发"
  示例："阿里云智能数据工程师" → company="阿里巴巴", department="阿里云智能", position="数据工程师"
  示例："美团外卖运营" → company="美团", department="外卖", position="运营"
  示例："京东物流产品经理" → company="京东", department="京东物流", position="产品经理"
  如果只有公司名没有子业务，department 填 null
- questions 尽量拆分为独立问题，即使用户只概括地提了
- duration 是分钟数（整数）或 null
- 如果用户说"感觉还行"之类的，feeling 填"一般"；"感觉不错/挺好"填"好"；"感觉凉了/不太好"填"差"
- result 如果用户没明确说通过或挂了，默认填"待定"
只返回 JSON，不要其他文字。`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = isOriginAllowed(request);
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method !== "POST") {
  
    // AI 求职教练
    if (path === "/api/coach") {
      const profile = body.profile as string ?? "";
      const tracking = body.tracking as string ?? "";
      const interviews = body.interviews as string ?? "";
      const newJobs = body.newJobs as string ?? "";
      const today = body.today as string ?? new Date().toISOString().slice(0, 10);
      if (profile.length < 10 && tracking.length < 5) {
        return Response.json({ error: "请先建立画像或添加投递记录" }, { status: 400, headers: cors });
      }
      return callDeepSeek(env, cors, COACH_PROMPT,
        `当前日期：${today}\n\n候选人画像：\n${profile}\n\n投递记录：\n${tracking}\n\n面试记录：\n${interviews}\n\n近期新岗位：\n${newJobs}`, 3000);
    }

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

    // 面试题追问
    if (path === "/api/skill/interview-followup") {
      const profile = body.profile as string ?? "";
      const job = body.job as string ?? "";
      const previous = body.previous as string ?? "";
      const followup = body.followup as string ?? "";
      const recentPrevious = previous.split("\n").slice(-20).join("\n");
      return callDeepSeek(env, cors, INTERVIEW_FOLLOWUP_PROMPT,
        `用户追问：\n${followup}\n\n候选人背景：\n${profile}\n\n目标岗位：\n${job}\n\n已有题目（最近）：\n${recentPrevious}`, 3000);
    }

    // 简历润色
    if (path === "/api/skill/resume-polish") {
      const profile = body.profile as string ?? "";
      const job = body.job as string ?? "";
      const experiences = body.experiences as string ?? "";
      return callDeepSeek(env, cors, RESUME_POLISH_PROMPT,
        `候选人画像：\n${profile}\n\n目标岗位：\n${job}\n\n现有经历描述：\n${experiences}`, 3000);
    }

    // 简历优化（合并版）
    if (path === "/api/skill/resume-optimize") {
      const profile = body.profile as string ?? "";
      const job = body.job as string ?? "";
      const experiences = body.experiences as string ?? "";
      return callDeepSeek(env, cors, RESUME_OPTIMIZE_PROMPT,
        `候选人画像：\n${profile}\n\n目标岗位 JD：\n${job}\n\n现有经历描述：\n${experiences}`, 8000);
    }

    // 求职信生成
    if (path === "/api/skill/cover-letter") {
      const profile = body.profile as string ?? "";
      const job = body.job as string ?? "";
      return callDeepSeek(env, cors, COVER_LETTER_PROMPT,
        `候选人画像：\n${profile}\n\n目标岗位：\n${job}`, 2000);
    }

    // 求职信修改
    if (path === "/api/skill/cover-letter-refine") {
      const profile = body.profile as string ?? "";
      const job = body.job as string ?? "";
      const letter = body.letter as string ?? "";
      const instruction = body.instruction as string ?? "";
      if (!letter || letter.length < 20) {
        return Response.json({ error: "求职信内容太短" }, { status: 400, headers: cors });
      }
      if (!instruction || instruction.length < 2) {
        return Response.json({ error: "请输入修改指令" }, { status: 400, headers: cors });
      }
      return callDeepSeek(env, cors, COVER_LETTER_REFINE_PROMPT,
        `候选人画像：\n${profile}\n\n目标岗位：\n${job}\n\n当前求职信：\n${letter}\n\n修改指令：\n${instruction}`, 2000);
    }

    // 简历修改
    if (path === "/api/skill/resume-refine") {
      const profile = body.profile as string ?? "";
      const job = body.job as string ?? "";
      const resume = body.resume as string ?? "";
      const instruction = body.instruction as string ?? "";
      if (!resume || resume.length < 20) {
        return Response.json({ error: "简历内容太短" }, { status: 400, headers: cors });
      }
      if (!instruction || instruction.length < 2) {
        return Response.json({ error: "请输入修改指令" }, { status: 400, headers: cors });
      }
      return callDeepSeek(env, cors, RESUME_REFINE_PROMPT,
        `候选人画像：\n${profile}\n\n目标岗位：\n${job}\n\n当前简历：\n${resume}\n\n修改指令：\n${instruction}`, 3000);
    }

    // Offer 对比
    if (path === "/api/skill/offer-compare") {
      const profile = body.profile as string ?? "";
      const offers = body.offers as string ?? "";
      return callDeepSeek(env, cors, OFFER_COMPARE_PROMPT,
        `候选人背景：\n${profile}\n\n待对比的 Offer：\n${offers}`, 3000);
    }

    // JD 匹配分析
    if (path === "/api/skill/jd-match") {
      const profile = body.profile as string ?? "";
      const job = body.job as string ?? "";
      return callDeepSeek(env, cors, JD_MATCH_PROMPT,
        `候选人画像：\n${profile}\n\n目标岗位 JD：\n${job}`, 3000);
    }

    // 一键定制简历
    if (path === "/api/skill/custom-resume") {
      const profile = body.profile as string ?? "";
      const job = body.job as string ?? "";
      const experiences = body.experiences as string ?? "";
      return callDeepSeek(env, cors, CUSTOM_RESUME_PROMPT,
        `候选人画像：\n${profile}\n\n目标岗位 JD：\n${job}\n\n现有经历描述：\n${experiences}`, 4000);
    }

    // 多 JD 对比排序
    if (path === "/api/skill/jd-compare") {
      const profile = body.profile as string ?? "";
      const jobs = body.jobs as string ?? "";
      return callDeepSeek(env, cors, JD_COMPARE_PROMPT,
        `候选人画像：\n${profile}\n\n待对比的岗位（用 --- 分隔）：\n${jobs}`, 4000);
    }

    // 方向模版参考
    if (path === "/api/skill/direction-template") {
      const profile = body.profile as string ?? "";
      const direction = body.direction as string ?? "";
      return callDeepSeek(env, cors, DIRECTION_TEMPLATE_PROMPT,
        `候选人画像：\n${profile}\n\n目标求职方向：\n${direction}`, 4000);
    }

    // 投递进展 AI 分析
    if (path === "/api/skill/progress-analyze") {
      const stats = body.stats as string ?? "";
      if (stats.length < 10) {
        return Response.json({ error: "数据不足，无法分析" }, { status: 400, headers: cors });
      }
      return callDeepSeek(env, cors, PROGRESS_ANALYZE_PROMPT, stats, 2000);
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


    // AI 求职教练
    if (path === "/api/coach") {
      const profile = body.profile as string ?? "";
      const tracking = body.tracking as string ?? "";
      const interviews = body.interviews as string ?? "";
      const newJobs = body.newJobs as string ?? "";
      const today = body.today as string ?? new Date().toISOString().slice(0, 10);
      if (profile.length < 10 && tracking.length < 5) {
        return Response.json({ error: "请先建立画像或添加投递记录" }, { status: 400, headers: cors });
      }
      return callDeepSeek(env, cors, COACH_PROMPT,
        `当前日期：${today}\n\n候选人画像：\n${profile}\n\n投递记录：\n${tracking}\n\n面试记录：\n${interviews}\n\n近期新岗位：\n${newJobs}`, 3000);
    }

    return new Response("Not Found", { status: 404, headers: cors });
  },
};
