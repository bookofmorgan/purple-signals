import { requireRole } from "@/lib/auth-helpers";
import SignalsClient from "./signals-client";

export const dynamic = "force-dynamic";

export default async function SignalsPage() {
  await requireRole(["leader", "employee"]);
  return <SignalsClient />;
}
