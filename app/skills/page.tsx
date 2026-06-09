import { getBuildData } from "@/lib/snapshot";
import SkillsClient from "@/components/SkillsClient";

export default function SkillsPage() {
  const { jobs } = getBuildData();
  return <SkillsClient jobs={jobs} />;
}
