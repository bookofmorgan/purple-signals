import { requireRole } from "@/lib/auth-helpers";
import CoachClient from "./coach-client";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  await requireRole(["leader", "employee"]);
  return <CoachClient />;
}
