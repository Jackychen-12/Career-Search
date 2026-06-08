import { getBuildData } from "@/lib/snapshot";
import ProfileClient from "@/components/ProfileClient";

export default function ProfilePage() {
  const { jobs } = getBuildData();
  return <ProfileClient jobs={jobs} />;
}
