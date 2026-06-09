import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "@/lib/config";
import type { CampusEvent, WechatArticle } from "@/lib/eventTypes";
import EventsClient from "@/components/EventsClient";

function readEvents(): CampusEvent[] {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, "events.json"), "utf8")) as CampusEvent[];
  } catch { return []; }
}

function readArticles(): WechatArticle[] {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, "articles.json"), "utf8")) as WechatArticle[];
  } catch { return []; }
}

export default function EventsPage() {
  return <EventsClient events={readEvents()} articles={readArticles()} />;
}
