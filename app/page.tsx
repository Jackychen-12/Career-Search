import HomeClient from "@/components/HomeClient";
import { getBuildData, copyJobsToPublic } from "@/lib/snapshot";

const INITIAL_JOB_COUNT = 50;

export default function Home() {
  const { jobs, meta, diff } = getBuildData();
  copyJobsToPublic(jobs);
  const now = meta?.fetchedAt ? new Date(meta.fetchedAt).getTime() : Date.now();
  const newJobIds = diff?.newJobIds ?? [];
  const initialJobs = jobs.slice(0, INITIAL_JOB_COUNT);
  const totalCount = jobs.length;
  return <HomeClient initialJobs={initialJobs} totalCount={totalCount} meta={meta} now={now} newJobIds={newJobIds} />;
}
