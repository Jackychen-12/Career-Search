import type { CampusEvent } from "../../../lib/eventTypes";
import { getText } from "../../lib/fetchUtil";

// 北京大学学生就业指导服务中心 - 宣讲会
const BASE_URL = "https://scc.pku.edu.cn";
const LIST_URL = `${BASE_URL}/xjh/`;

function parseDate(text: string): string {
  const match = text.match(/(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})/);
  if (match) return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  return "";
}

function parseId(url: string): string {
  const match = url.match(/\/(\d+)/) || url.match(/id=(\d+)/);
  return match ? `pku-${match[1]}` : `pku-${Date.now()}`;
}

export async function fetchPekingEvents(): Promise<CampusEvent[]> {
  try {
    const html = await getText(LIST_URL);
    const events: CampusEvent[] = [];

    const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];

    for (const row of rows) {
      const linkMatch = row.match(/href="([^"]+)"/);
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) ?? [];

      if (cells.length < 3) continue;

      const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").trim();
      const company = stripTags(cells[0] ?? "");
      const dateText = stripTags(cells[1] ?? "");
      const location = stripTags(cells[2] ?? "");

      if (!company || company.includes("单位") || company.includes("公司名")) continue;

      const date = parseDate(dateText);
      if (!date) continue;

      const eventDate = new Date(date);
      const daysAgo = (Date.now() - eventDate.getTime()) / 86400000;
      if (daysAgo > 30) continue;

      const url = linkMatch ? (linkMatch[1].startsWith("http") ? linkMatch[1] : BASE_URL + linkMatch[1]) : LIST_URL;

      events.push({
        id: parseId(url),
        company,
        title: `${company} 宣讲会`,
        type: "宣讲会",
        date,
        time: dateText.match(/(\d{1,2}:\d{2})/)?.[1],
        location: location || "北京大学",
        school: "北京大学",
        url,
        source: "北大",
      });
    }

    return events;
  } catch (e) {
    console.warn(`[events:peking] Failed: ${(e as Error).message}`);
    return [];
  }
}
