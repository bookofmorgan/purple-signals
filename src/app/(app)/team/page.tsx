import TeamClient from "./team-client";
import { requireRole } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  // Allow leaders to also view this view (Open Question OQ — keep generous for the demo).
  await requireRole(["leader", "employee"]);
  return <TeamClient />;
}
