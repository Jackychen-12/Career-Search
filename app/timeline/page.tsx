import { getBuildData } from "@/lib/snapshot";
import TrackingPageClient from "@/components/TrackingPageClient";

export default function TrackingPage() {
  const { jobs } = getBuildData();
  return <TrackingPageClient jobs={jobs} />;
}
