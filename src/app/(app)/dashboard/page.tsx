import { requireRole } from "@/lib/auth-helpers";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function LeadershipDashboardPage() {
  await requireRole(["leader"]);
  return <DashboardClient />;
}
