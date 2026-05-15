import { requireRole } from "@/lib/auth-helpers";
import TrendsClient from "./trends-client";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  await requireRole(["leader", "employee"]);
  return <TrendsClient />;
}
