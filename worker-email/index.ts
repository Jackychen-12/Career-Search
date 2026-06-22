import PostalMime from "postal-mime";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  DEEPSEEK_API_KEY: string;
}

interface ParsedEmail {
  company: string;
  position: string;
  action: string;
  date: string | null;
  confidence: number;
  summary: string;
}

const EMAIL_PARSE_PROMPT = `你是求职邮件解析专家。从邮件的主题和正文中提取结构化信息。
返回 JSON：
{
  "company": "公司名",
  "position": "岗位名（如有，否则null）",
  "action": "applied|interview_invite|written_test|offer|rejection|other",
  "date": "相关日期 YYYY-MM-DD（如有，否则null）",
  "confidence": 0.85,
  "summary": "一句话概括邮件内容"
}
规则：
- action 含义：applied=投递确认/简历已投递, interview_invite=面试邀请/面试通知, written_test=笔试通知, offer=录用通知/offer, rejection=拒信/不合适, other=非求职相关
- company 提取正式中文公司名（如"字节跳动"而非"ByteDance HR"，"腾讯"而非"Tencent Recruitment"）
- 如果邮件明显不是求职相关（广告/通知/验证码等），confidence 设为 0，action 设为 "other"
- date 提取邮件中提到的面试/笔试日期，不是邮件发送日期
只返回 JSON。`;

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function supabaseQuery(
  env: Env,
  table: string,
  query: string
): Promise<Record<string, unknown>[] | null> {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/${table}?${query}`,
    {
      headers: {
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  if (!res.ok) return null;
  return res.json() as Promise<Record<string, unknown>[]>;
}

async function supabaseInsert(
  env: Env,
  table: string,
  data: Record<string, unknown>
): Promise<boolean> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(data),
  });
  return res.ok;
}

async function callDeepSeek(
  env: Env,
  subject: string,
  body: string
): Promise<ParsedEmail> {
  const fallback: ParsedEmail = {
    company: "",
    position: "",
    action: "other",
    date: null,
    confidence: 0,
    summary: "",
  };

  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: EMAIL_PARSE_PROMPT },
          {
            role: "user",
            content: `邮件主题：${subject}\n\n邮件正文：\n${body.slice(0, 3000)}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!res.ok) return fallback;

    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    const content = data.choices[0]?.message?.content ?? "";
    const jsonStr = content
      .replace(/```json\n?/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(jsonStr) as ParsedEmail;
  } catch {
    return fallback;
  }
}

async function streamToArrayBuffer(
  stream: ReadableStream<Uint8Array>
): Promise<ArrayBuffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLength += value.length;
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result.buffer;
}

export default {
  async email(
    message: ForwardableEmailMessage,
    env: Env
  ): Promise<void> {
    const toAddress = message.to;
    const code = toAddress.split("@")[0].toLowerCase();

    if (!code || code.length < 4) return;

    const rows = await supabaseQuery(
      env,
      "email_inboxes",
      `inbox_code=eq.${encodeURIComponent(code)}&select=user_id`
    );
    if (!rows || rows.length === 0) return;

    const userId = rows[0].user_id as string;

    const rawEmail = await streamToArrayBuffer(message.raw);
    const parsed = await new PostalMime().parse(rawEmail);

    const bodyText =
      parsed.text || (parsed.html ? htmlToText(parsed.html) : "");

    if (!bodyText && !parsed.subject) return;

    const aiResult = await callDeepSeek(
      env,
      parsed.subject || "",
      bodyText
    );

    if (aiResult.confidence < 0.2 && aiResult.action === "other") return;

    await supabaseInsert(env, "email_records", {
      user_id: userId,
      from_address: message.from,
      subject: parsed.subject || "",
      body_preview: bodyText.slice(0, 500),
      parsed_company: aiResult.company || null,
      parsed_position: aiResult.position || null,
      parsed_action: aiResult.action,
      parsed_date: aiResult.date || null,
      confidence: aiResult.confidence,
      status: "pending",
    });
  },
};
