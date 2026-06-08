import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "@/lib/config";
import type { CampusEvent } from "@/lib/eventTypes";
import EventsClient from "@/components/EventsClient";

function readEvents(): CampusEvent[] {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, "events.json"), "utf8");
    return JSON.parse(raw) as CampusEvent[];
  } catch {
    return [];
  }
}

export default function EventsPage() {
  const events = readEvents();
  return <EventsClient events={events} />;
}
