import type { CampusEvent, WechatArticle } from "../../../lib/eventTypes";
import { fetchTsinghuaEvents } from "./tsinghua";
import { fetchPekingEvents } from "./peking";
import { fetchSogouEvents } from "./sogou";
import { fetchWechatArticles } from "./wechatArticles";

export async function fetchAllEvents(): Promise<{ events: CampusEvent[]; articles: WechatArticle[] }> {
  const [thu, pku, sogou, articles] = await Promise.allSettled([
    fetchTsinghuaEvents(),
    fetchPekingEvents(),
    fetchSogouEvents(),
    fetchWechatArticles(),
  ]);

  const events: CampusEvent[] = [];
  if (thu.status === "fulfilled") events.push(...thu.value);
  if (pku.status === "fulfilled") events.push(...pku.value);
  if (sogou.status === "fulfilled") events.push(...sogou.value);

  const seen = new Set<string>();
  const unique = events.filter((e) => {
    if (seen.has(e.title)) return false;
    seen.add(e.title);
    return true;
  });
  unique.sort((a, b) => b.date.localeCompare(a.date));

  const articleList = articles.status === "fulfilled" ? articles.value : [];

  console.log(`[events] ${unique.length} events (清华: ${thu.status === "fulfilled" ? thu.value.length : 0}, 北大: ${pku.status === "fulfilled" ? pku.value.length : 0}, 搜狗: ${sogou.status === "fulfilled" ? sogou.value.length : 0})`);
  console.log(`[articles] ${articleList.length} wechat articles`);

  return { events: unique, articles: articleList };
}
