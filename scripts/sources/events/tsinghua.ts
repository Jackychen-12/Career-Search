import type { CampusEvent } from "../../../lib/eventTypes";
import { getText } from "../../lib/fetchUtil";

// 清华大学学生职业发展指导中心 - 宣讲会列表
const BASE_URL = "https://career.cic.tsinghua.edu.cn";
const LIST_URL = `${BASE_URL}/xjh/xjh_index.html`;

function parseDate(text: string): string {
  const match = text.match(/(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})/);
  if (match) return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  return "";
}

function parseId(url: string): string {
  const match = url.match(/\/(\d+)\.html/) || url.match(/id=(\d+)/);
  return match ? `thu-${match[1]}` : `thu-${Date.now()}`;
}

export async function fetchTsinghuaEvents(): Promise<CampusEvent[]> {
  try {
    const html = await getText(LIST_URL);
    const events: CampusEvent[] = [];

    // Parse the HTML list - Tsinghua career site uses a table/list format
    // Pattern: each event is a row with company name, date, location, link
    const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];

    for (const row of rows) {
      const linkMatch = row.match(/href="([^"]+)"/);
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) ?? [];

      if (cells.length < 3) continue;

      const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").trim();
      const company = stripTags(cells[0] ?? "");
      const dateText = stripTags(cells[1] ?? "");
      const location = stripTags(cells[2] ?? "");

      if (!company || company.includes("公司名称")) continue;

      const date = parseDate(dateText);
      if (!date) continue;

      // Only keep events from last 30 days or future
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
        location: location || "清华大学",
        school: "清华大学",
        url,
        source: "清华",
      });
    }

    return events;
  } catch (e) {
    console.warn(`[events:tsinghua] Failed: ${(e as Error).message}`);
    return [];
  }
}
