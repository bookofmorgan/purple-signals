import { requireRole } from "@/lib/auth-helpers";
import SurveyClient from "./survey-client";

export const dynamic = "force-dynamic";

export default async function SurveyPage() {
  await requireRole(["leader", "employee"]);
  return <SurveyClient />;
}
