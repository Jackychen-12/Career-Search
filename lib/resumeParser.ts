import { supabase } from "./supabase";
import type { Experience } from "./types";

const WORKER_URL =
  typeof window !== "undefined"
    ? "/ai"
    : process.env.NEXT_PUBLIC_WORKER_URL || "https://career-search-oauth.keyu-chen.workers.dev";

export interface ParsedResume {
  school?: string;
  major?: string;
  degree?: string;
  skills: string[];
  targetRoles: string[];
  experience: string[];
  experiences?: Experience[];
  strengths: string[];
  weaknesses: string[];
  summary: string;
}

export async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(text);
  }
  return pages.join("\n\n");
}

export async function parseResumeWithAI(text: string): Promise<ParsedResume> {
  if (!WORKER_URL) {
    throw new Error("Worker URL 未配置");
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("请先登录后使用简历解析");

  const res = await fetch(`${WORKER_URL}/api/resume/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ text: text.slice(0, 8000) }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `解析失败 (${res.status})`);
  }

  return (await res.json()) as ParsedResume;
}

export function extractKeywordsLocal(text: string): string[] {
  const keywords = new Set<string>();
  const patterns = [
    /(?:熟悉|精通|掌握|了解|擅长|使用|具备)[：:]?\s*([^。，；\n]+)/g,
    /(?:技能|技术|工具|语言)[：:]?\s*([^。\n]+)/g,
  ];
  for (const p of patterns) {
    let m;
    while ((m = p.exec(text)) !== null) {
      m[1].split(/[,，、/|;；\s]+/).forEach((w) => {
        const t = w.trim();
        if (t.length >= 2 && t.length <= 10) keywords.add(t);
      });
    }
  }
  const commonSkills = [
    "Python", "Java", "JavaScript", "TypeScript", "Go", "C++", "SQL", "R",
    "机器学习", "深度学习", "NLP", "CV", "大模型", "LLM", "AI", "AIGC",
    "数据分析", "数据挖掘", "Tableau", "PowerBI",
    "产品经理", "产品设计", "用户研究", "需求分析", "PRD",
    "金融", "投行", "风控", "量化", "CFA", "FRM",
    "React", "Vue", "Node", "Docker", "Kubernetes", "AWS",
    "Excel", "PPT", "Figma", "Sketch",
  ];
  for (const skill of commonSkills) {
    if (text.includes(skill)) keywords.add(skill);
  }
  return [...keywords].slice(0, 30);
}
