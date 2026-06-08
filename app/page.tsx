import HomeClient from "@/components/HomeClient";
import { getBuildData } from "@/lib/snapshot";

// Static export: the snapshot is read at build time and baked into the page;
// all filtering / sorting / personalization then happens client-side.
export default function Home() {
  const { jobs, meta, diff } = getBuildData();
  // Computed once at build and serialized into props, so server + client agree
  // (no hydration mismatch). Deadline countdowns are relative to this build time.
  const now = meta?.fetchedAt ? new Date(meta.fetchedAt).getTime() : Date.now();
  const newJobIds = diff?.newJobIds ?? [];
  return <HomeClient jobs={jobs} meta={meta} now={now} newJobIds={newJobIds} />;
}
