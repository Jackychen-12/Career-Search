import { getBuildData } from "@/lib/snapshot";
import JobDetailClient from "@/components/JobDetailClient";

export function generateStaticParams() {
  const { jobs } = getBuildData();
  return jobs.map((j) => ({ id: j.id }));
}

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const { jobs } = getBuildData();
  const job = jobs.find((j) => j.id === params.id) ?? null;
  return <JobDetailClient job={job} jobs={jobs} />;
}
