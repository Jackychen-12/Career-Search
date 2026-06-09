/**
 * Boss 直聘校招爬虫 — 半自动模式
 *
 * 使用方法：npx tsx scripts/crawl-boss.ts
 *
 * 流程：
 * 1. 打开 Chrome，你手动导航到校招页面
 * 2. 过验证码、登录（如需要）
 * 3. 在终端按 Enter，脚本开始提取当前页面数据
 * 4. 提取完成后自动翻页继续
 */

import puppeteer, { type Page } from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import type { RawJob } from "../lib/types";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUTPUT_PATH = path.join(process.cwd(), "data", "boss-jobs.json");

interface BossJob {
  company: string;
  title: string;
  salary: string;
  city: string;
  education: string;
  tags: string[];
  url: string;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function waitForEnter(prompt: string): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, () => { rl.close(); resolve(); });
  });
}

async function extractJobs(page: Page): Promise<BossJob[]> {
  return page.evaluate(() => {
    const items: BossJob[] = [];

    // Try multiple selectors for different Boss page layouts
    const selectors = [
      ".job-card-wrap",
      ".job-list-item",
      ".campus-job-item",
      "[class*='job-card']",
      ".search-job-result .job-card-body",
    ];

    let cards: NodeListOf<Element> | null = null;
    for (const sel of selectors) {
      const found = document.querySelectorAll(sel);
      if (found.length > 0) { cards = found; break; }
    }

    if (!cards || cards.length === 0) {
      // Fallback: try to find any job-like structures
      const allLinks = document.querySelectorAll("a[href*='/job_detail'], a[ka*='job']");
      allLinks.forEach((a) => {
        const parent = a.closest("li, div[class*='card'], div[class*='item']");
        if (!parent) return;
        const text = parent.textContent ?? "";
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length >= 2) {
          items.push({
            company: lines.find((l) => l.length > 2 && l.length < 20 && !l.includes("K") && !l.includes("天")) ?? "",
            title: lines[0] ?? "",
            salary: lines.find((l) => /\d+K|\d+元|\d+\/天/.test(l)) ?? "",
            city: lines.find((l) => /(北京|上海|深圳|广州|杭州|成都|南京|武汉)/.test(l)) ?? "",
            education: lines.find((l) => /(本科|硕士|博士|大专)/.test(l)) ?? "",
            tags: [],
            url: (a as HTMLAnchorElement).href ?? "",
          });
        }
      });
      return items;
    }

    cards.forEach((card) => {
      const getText = (sels: string[]) => {
        for (const s of sels) {
          const el = card.querySelector(s);
          if (el?.textContent?.trim()) return el.textContent.trim();
        }
        return "";
      };

      const getHref = (sels: string[]) => {
        for (const s of sels) {
          const el = card.querySelector(s) as HTMLAnchorElement | null;
          if (el?.href) return el.href;
        }
        return "";
      };

      const title = getText([".job-name", ".job-title", "h3", ".name", "[class*='title']"]);
      const company = getText([".company-name", ".info-company", ".company-text", "[class*='company']"]);

      if (!title && !company) return;

      items.push({
        company,
        title,
        salary: getText([".salary", ".job-salary", ".red", "[class*='salary']"]),
        city: getText([".job-area", ".info-city", "[class*='city']", "[class*='area']"]),
        education: getText([".job-degree", ".info-edu", "[class*='degree']", "[class*='edu']"]),
        tags: Array.from(card.querySelectorAll("[class*='tag'] span, [class*='label'] span")).map((t) => t.textContent?.trim() ?? "").filter(Boolean).slice(0, 3),
        url: getHref(["a[href*='job_detail']", "a[href*='campus']", "a"]),
      });
    });

    return items;
  });
}

function toRawJob(job: BossJob): RawJob | null {
  if (!job.company || !job.title) return null;
  const cities = job.city.split(/[·,，、\s]/).map((c) => c.trim()).filter((c) => c.length >= 2);
  return {
    origin: "boss",
    company: job.company,
    companyTier: 2,
    title: job.title,
    category: "互联网",
    jobType: /实习/.test(job.title) ? "日常实习" : "秋招",
    location: cities.length > 0 ? cities : ["未知"],
    region: "大陆",
    salary: job.salary || null,
    requirements: job.education || null,
    deadline: null,
    applyUrl: job.url.startsWith("http") ? job.url : job.url ? `https://www.zhipin.com${job.url}` : "https://www.zhipin.com/web/campus/",
    description: null,
    tags: job.tags.length > 0 ? job.tags : ["Boss直聘"],
  };
}

async function main() {
  console.log("[boss] 启动 Chrome（非无头模式）...\n");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"],
    defaultViewport: null,
  });

  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  console.log("[boss] Chrome 已打开。请手动操作：");
  console.log("  1. 在浏览器中打开 https://www.zhipin.com/web/campus/");
  console.log("  2. 如果有验证码，手动完成");
  console.log("  3. 确保能看到校招岗位列表");
  console.log("");

  await page.goto("https://www.zhipin.com/web/campus/", { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});

  await waitForEnter("准备好后按 Enter 开始提取...");

  const allJobs: BossJob[] = [];

  for (let i = 0; i < 10; i++) {
    console.log(`[boss] 提取当前页面数据...`);
    const jobs = await extractJobs(page);
    console.log(`[boss] 本页提取: ${jobs.length} 条`);
    allJobs.push(...jobs);

    if (jobs.length === 0 && i > 0) {
      console.log("[boss] 无更多数据");
      break;
    }

    // Try to click next page
    try {
      const nextBtn = await page.$(".ui-icon-arrow-right, [class*='next'], a[ka*='next']");
      if (nextBtn) {
        await nextBtn.click();
        await delay(3000 + Math.random() * 2000);
      } else {
        console.log("[boss] 找不到下一页按钮，停止");
        break;
      }
    } catch {
      console.log("[boss] 翻页失败，停止");
      break;
    }
  }

  await browser.close();

  const seen = new Set<string>();
  const unique = allJobs.filter((j) => {
    const key = `${j.company}|${j.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const rawJobs = unique.map(toRawJob).filter((j): j is RawJob => j !== null);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(rawJobs, null, 2) + "\n", "utf8");

  console.log(`\n[boss] 完成! ${rawJobs.length} 条岗位 → ${OUTPUT_PATH}`);
  console.log("[boss] 运行 'npm run crawl' 合并到主数据集");
}

main().catch((e) => {
  console.error("[boss] 错误:", e.message);
  process.exit(1);
});
