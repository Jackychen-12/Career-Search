import { getBuildData } from "@/lib/snapshot";
import TrackingAndInterviewPage from "@/components/TrackingAndInterviewPage";

export default function TrackingPage() {
  const { jobs } = getBuildData();
  return <TrackingAndInterviewPage jobs={jobs} />;
}
