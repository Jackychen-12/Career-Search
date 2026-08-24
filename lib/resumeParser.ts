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

/** Phones choke well before this; anything larger is a scan, not a resume. */
const MAX_PDF_BYTES = 15 * 1024 * 1024;
/** A resume is 1-3 pages. Capping keeps a mis-picked 200-page PDF from OOM-ing a phone. */
const MAX_PDF_PAGES = 12;
const PDF_TIMEOUT_MS = 60_000;
const AI_TIMEOUT_MS = 60_000;

/**
 * Already phrased for the user — `extractPdfText` passes these through untouched.
 */
class ResumeInputError extends Error {
  readonly userFacing = true;
}

/** Turn pdf.js internals into something a user can act on. */
function describePdfError(e: unknown): string {
  const err = e as { name?: string; message?: string };
  const name = err?.name ?? "";
  const msg = err?.message ?? String(e);

  if (name === "PasswordException") {
    return "这份 PDF 设了打开密码，无法读取。请导出一份不加密的版本，或直接把简历文字粘贴到下方输入框。";
  }
  if (name === "InvalidPDFException") {
    return "这个文件不是有效的 PDF（可能是改了后缀的图片或已损坏）。换一份 PDF 或粘贴简历文字。";
  }
  if (name === "MissingPDFException") {
    return "读取文件失败，可能文件已被移动或云盘尚未下载完成。请重新选择文件。";
  }
  if (/withResolvers|is not a function|structuredClone/i.test(msg)) {
    return "当前浏览器版本偏旧，无法在本机解析 PDF。请用系统浏览器（Safari / Chrome）打开本站，或直接粘贴简历文字。";
  }
  if (/worker|dynamically imported module|importScripts|Failed to fetch/i.test(msg)) {
    return "PDF 解析组件加载失败（常见于弱网或微信内置浏览器）。请刷新重试、在系统浏览器中打开，或粘贴简历文字。";
  }
  if (msg === "PDF_TIMEOUT") {
    return "解析超时，通常是文件过大或手机内存不足。可以压缩后重试，或直接粘贴简历文字。";
  }
  return `PDF 解析失败：${msg}。可以直接粘贴简历文字继续。`;
}

export async function extractPdfText(file: File): Promise<string> {
  const looksLikePdf =
    file.type === "application/pdf" || /\.pdf$/i.test(file.name ?? "");
  if (!looksLikePdf) {
    throw new ResumeInputError("只支持 PDF 格式的简历。如果是 Word/图片，请导出成 PDF 或粘贴简历文字。");
  }
  if (file.size === 0) {
    throw new ResumeInputError("这个文件是空的，可能云盘还没下载完。请等文件下载完成后重新选择。");
  }
  if (file.size > MAX_PDF_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new ResumeInputError(
      `文件 ${mb}MB，超过 15MB 上限，手机上大概率解析失败。请压缩后重试或粘贴简历文字。`,
    );
  }

  // The default entry point (build/pdf.mjs) calls Promise.withResolvers on the
  // first getDocument — that only exists in Chrome 119+ / Safari 17.4+, so it
  // throws outright on iOS 16 and the WeChat/Android WebViews people open the
  // site from. The legacy bundle is the same library transpiled with core-js
  // polyfills, which is exactly what those browsers need.
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const task = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    // CJK resumes exported by WPS/Word use CID-keyed fonts; without these the
    // text comes back empty or as garbage.
    cMapUrl: "/pdfjs/cmaps/",
    cMapPacked: true,
    standardFontDataUrl: "/pdfjs/standard_fonts/",
    wasmUrl: "/pdfjs/wasm/",
    // We only ever read text, never paint — skipping font faces cuts memory,
    // which is what actually runs out on phones.
    disableFontFace: true,
    verbosity: 0,
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const pdf = await Promise.race([
      task.promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("PDF_TIMEOUT")), PDF_TIMEOUT_MS);
      }),
    ]);

    const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES);
    const pages: string[] = [];
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
      // Phones run out of memory long before desktops do.
      page.cleanup();
    }

    const text = pages.join("\n\n").replace(/[ \t]+/g, " ").trim();
    if (text.replace(/\s/g, "").length < 30) {
      throw new ResumeInputError(
        "这份 PDF 里读不到文字，看起来是扫描件或图片版简历。请把简历内容粘贴到下方输入框，一样能生成画像。",
      );
    }
    return text;
  } catch (e) {
    if (e instanceof ResumeInputError) throw e;
    throw new Error(describePdfError(e));
  } finally {
    if (timer) clearTimeout(timer);
    // Tears down the document and its worker. Without it every retry on a phone
    // stacks another document's worth of memory until the tab dies.
    try {
      await task.destroy();
    } catch {
      /* already torn down */
    }
  }
}

export async function parseResumeWithAI(text: string): Promise<ParsedResume> {
  if (!WORKER_URL) {
    throw new Error("Worker URL 未配置");
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("请先登录后使用简历解析");

  // Mobile networks stall silently; without this the button spins forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${WORKER_URL}/api/resume/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: text.slice(0, 8000) }),
      signal: controller.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      throw new Error("AI 解析超时，请检查网络后重试。");
    }
    throw new Error("网络请求失败，请检查网络后重试。");
  } finally {
    clearTimeout(timer);
  }

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
