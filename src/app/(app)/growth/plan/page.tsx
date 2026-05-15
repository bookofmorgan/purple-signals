import { requireRole } from "@/lib/auth-helpers";
import PlanClient from "./plan-client";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  await requireRole(["leader", "employee"]);
  return <PlanClient />;
}
