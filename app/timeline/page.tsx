import { getBuildData } from "@/lib/snapshot";
import TimelineClient from "@/components/TimelineClient";

export default function TimelinePage() {
  const { jobs } = getBuildData();
  return <TimelineClient jobs={jobs} />;
}
