/**
 * Boss 直聘校招爬虫 — 本地手动运行
 *
 * 使用方法：npx tsx scripts/crawl-boss.ts
 *
 * 注意：
 * - 需要本地安装 Chrome
 * - 首次运行可能需要手动过验证码（脚本会等 30 秒）
 * - 爬取完成后数据写入 data/boss-jobs.json
 * - commit 后 Vercel 自动部署
 */

import puppeteer, { type Page } from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import type { RawJob } from "../lib/types";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUTPUT_PATH = path.join(process.cwd(), "data", "boss-jobs.json");

const CAMPUS_URL = "https://www.zhipin.com/web/campus/?city=100010000&experience=108&page=";

interface BossJob {
  company: string;
  title: string;
  salary: string;
  city: string;
  education: string;
  tags: string[];
  url: string;
}

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function scrapePage(page: Page, pageNum: number): Promise<BossJob[]> {
  const url = CAMPUS_URL + pageNum;
  console.log(`[boss] 正在抓取第 ${pageNum} 页...`);

  await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
  await delay(2000 + Math.random() * 2000);

  const jobs = await page.evaluate(() => {
    const items: BossJob[] = [];
    const cards = document.querySelectorAll(".job-card-wrap, .campus-job-item, .job-list li");

    cards.forEach((card) => {
      const titleEl = card.querySelector(".job-name, .job-title, h3 a");
      const companyEl = card.querySelector(".company-name, .info-company a, .company-text");
      const salaryEl = card.querySelector(".salary, .job-salary, .red");
      const cityEl = card.querySelector(".job-area, .info-city, .job-info span:first-child");
      const eduEl = card.querySelector(".job-degree, .info-edu");
      const linkEl = card.querySelector("a[href*='/job_detail'], a[href*='/campus']") as HTMLAnchorElement;
      const tagEls = card.querySelectorAll(".tag-list span, .info-label span, .job-tags span");

      const title = titleEl?.textContent?.trim() ?? "";
      const company = companyEl?.textContent?.trim() ?? "";

      if (!title || !company) return;

      items.push({
        company,
        title,
        salary: salaryEl?.textContent?.trim() ?? "",
        city: cityEl?.textContent?.trim() ?? "",
        education: eduEl?.textContent?.trim() ?? "",
        tags: Array.from(tagEls).map((t) => t.textContent?.trim() ?? "").filter(Boolean).slice(0, 3),
        url: linkEl?.href ?? "",
      });
    });

    return items;
  });

  console.log(`[boss] 第 ${pageNum} 页: ${jobs.length} 条`);
  return jobs;
}

function toRawJob(job: BossJob): RawJob {
  const cities = job.city.split(/[·,，、]/).map((c) => c.trim()).filter(Boolean);
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
    applyUrl: job.url.startsWith("http") ? job.url : `https://www.zhipin.com${job.url}`,
    description: null,
    tags: job.tags.length > 0 ? job.tags : ["Boss直聘"],
  };
}

async function main() {
  console.log("[boss] 启动 Chrome...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");

  console.log("[boss] 首次打开页面，如果出现验证码请手动完成（30秒等待）...");
  await page.goto("https://www.zhipin.com/web/campus/", { waitUntil: "networkidle2", timeout: 30000 });
  await delay(5000);

  const allJobs: BossJob[] = [];
  const maxPages = 10;

  for (let i = 1; i <= maxPages; i++) {
    try {
      const jobs = await scrapePage(page, i);
      allJobs.push(...jobs);
      if (jobs.length === 0) {
        console.log("[boss] 无更多数据，停止");
        break;
      }
      await delay(3000 + Math.random() * 3000);
    } catch (e) {
      console.warn(`[boss] 第 ${i} 页失败: ${(e as Error).message}`);
      break;
    }
  }

  await browser.close();

  // Dedupe by company + title
  const seen = new Set<string>();
  const unique = allJobs.filter((j) => {
    const key = `${j.company}|${j.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const rawJobs = unique.map(toRawJob);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(rawJobs, null, 2) + "\n", "utf8");

  console.log(`\n[boss] 完成! 共 ${rawJobs.length} 条岗位，已写入 ${OUTPUT_PATH}`);
  console.log("[boss] 运行 'npm run crawl' 合并到主数据集");
}

main().catch((e) => {
  console.error("[boss] 错误:", e);
  process.exit(1);
});
