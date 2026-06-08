import { OPENSOURCE_REPOS, type RepoSource } from "../../config/sources.config";
import type { RawJob } from "../../lib/types";
import { getText } from "../lib/fetchUtil";
import type { SourceAdapter } from "./types";

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function stripMd(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](url) -> text
    .replace(/[*`_]/g, "")
    .trim();
}

function extractUrl(s: string): string | null {
  const md = s.match(/\]\((https?:\/\/[^)]+)\)/);
  if (md) return md[1];
  const bare = s.match(/https?:\/\/[^\s)|]+/);
  return bare ? bare[0] : null;
}

function splitLoc(s: string): string[] {
  if (!s) return ["未知"];
  return stripMd(s)
    .split(/[;,/、|]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function parseMdTable(md: string, repo: RepoSource): RawJob[] {
  const lines = md.split("\n").filter((l) => l.trim().startsWith("|"));
  if (lines.length < 3) return [];
  const header = splitRow(lines[0]).map((h) => h.toLowerCase());
  const idx = (keys: string[]) => header.findIndex((h) => keys.some((k) => h.includes(k)));
  const ci = {
    company: idx(["公司", "company", "企业", "name"]),
    title: idx(["岗位", "职位", "title", "role", "job", "职能", "方向"]),
    location: idx(["地点", "城市", "location", "base", "工作地"]),
    link: idx(["链接", "link", "投递", "apply", "url", "公告", "网申", "application"]),
    deadline: idx(["截止", "deadline", "ddl", "date"]),
  };
  if (ci.company < 0 && ci.title < 0) return [];

  const out: RawJob[] = [];
  let prevCompany = "";
  for (const line of lines.slice(2)) {
    const cells = splitRow(line);
    const get = (i: number) => (i >= 0 && i < cells.length ? cells[i] : "");
    let company = stripMd(get(ci.company));
    if (company === "↳" || company === "└") {
      company = prevCompany;
    }
    if (!company || company === "-") continue;
    prevCompany = company;

    const linkCell = get(ci.link);
    if (linkCell.includes("Closed") || linkCell.includes("🔒")) continue;

    const url = extractUrl(linkCell) || extractUrl(line);
    if (!url) continue;
    out.push({
      origin: repo.id,
      company,
      companyTier: 2,
      title: stripMd(get(ci.title)) || "校招 / 实习",
      category: repo.category,
      region: repo.region,
      location: splitLoc(get(ci.location)),
      deadline: null,
      applyUrl: url,
      detailUrl: url,
      tags: ["开源仓库"],
    });
  }
  return out;
}

async function fetchRepo(repo: RepoSource): Promise<RawJob[]> {
  const branch = repo.branch ?? "main";
  const url = `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${branch}/${repo.path}`;
  const md = await getText(url);
  return parseMdTable(md, repo);
}

export const openSourceRepos: SourceAdapter = {
  id: "repo",
  label: "开源仓库",
  async fetch() {
    if (OPENSOURCE_REPOS.length === 0) return [];
    const out: RawJob[] = [];
    const settled = await Promise.allSettled(OPENSOURCE_REPOS.map(fetchRepo));
    settled.forEach((r) => {
      if (r.status === "fulfilled") out.push(...r.value);
    });
    return out;
  },
};
