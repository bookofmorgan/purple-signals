import { requireRole } from "@/lib/auth-helpers";
import TeamGrowthClient from "./team-growth-client";

export const dynamic = "force-dynamic";

export default async function TeamGrowthPage() {
  await requireRole(["leader"]);
  return <TeamGrowthClient />;
}
