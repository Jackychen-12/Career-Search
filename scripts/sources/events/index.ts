import type { CampusEvent } from "../../../lib/eventTypes";
import { fetchTsinghuaEvents } from "./tsinghua";
import { fetchPekingEvents } from "./peking";
import { fetchSogouEvents } from "./sogou";

export async function fetchAllEvents(): Promise<CampusEvent[]> {
  const [thu, pku, sogou] = await Promise.allSettled([
    fetchTsinghuaEvents(),
    fetchPekingEvents(),
    fetchSogouEvents(),
  ]);

  const events: CampusEvent[] = [];
  if (thu.status === "fulfilled") events.push(...thu.value);
  if (pku.status === "fulfilled") events.push(...pku.value);
  if (sogou.status === "fulfilled") events.push(...sogou.value);

  // Dedupe by title
  const seen = new Set<string>();
  const unique = events.filter((e) => {
    if (seen.has(e.title)) return false;
    seen.add(e.title);
    return true;
  });

  unique.sort((a, b) => b.date.localeCompare(a.date));

  const counts = [
    `清华: ${thu.status === "fulfilled" ? thu.value.length : 0}`,
    `北大: ${pku.status === "fulfilled" ? pku.value.length : 0}`,
    `微信: ${sogou.status === "fulfilled" ? sogou.value.length : 0}`,
  ].join(", ");
  console.log(`[events] Fetched ${unique.length} events (${counts})`);
  return unique;
}
