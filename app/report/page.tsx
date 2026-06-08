import { getBuildData } from "@/lib/snapshot";
import ReportClient from "@/components/ReportClient";

export default function ReportPage() {
  const { jobs } = getBuildData();
  return <ReportClient jobs={jobs} />;
}
