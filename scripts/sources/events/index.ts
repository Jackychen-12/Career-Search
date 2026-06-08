import type { CampusEvent } from "../../../lib/eventTypes";
import { fetchTsinghuaEvents } from "./tsinghua";
import { fetchPekingEvents } from "./peking";

export async function fetchAllEvents(): Promise<CampusEvent[]> {
  const [thu, pku] = await Promise.allSettled([
    fetchTsinghuaEvents(),
    fetchPekingEvents(),
  ]);

  const events: CampusEvent[] = [];
  if (thu.status === "fulfilled") events.push(...thu.value);
  if (pku.status === "fulfilled") events.push(...pku.value);

  // Sort by date descending (newest first)
  events.sort((a, b) => b.date.localeCompare(a.date));

  console.log(`[events] Fetched ${events.length} events (清华: ${thu.status === "fulfilled" ? thu.value.length : 0}, 北大: ${pku.status === "fulfilled" ? pku.value.length : 0})`);
  return events;
}
