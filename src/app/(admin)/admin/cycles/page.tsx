import { createAdminClient } from "@/lib/supabase/admin";
import CyclesClient from "./cycles-client";

export const dynamic = "force-dynamic";

export default async function AdminCyclesPage() {
  const admin = createAdminClient();
  const [{ data: orgs }, { data: cycles }, { data: questions }] = await Promise.all([
    admin.from("orgs").select("*").order("created_at", { ascending: false }),
    admin.from("cycles").select("*").order("created_at", { ascending: false }),
    admin.from("questions").select("*, categories(name)").order("category_id")
  ]);
  return <CyclesClient orgs={orgs ?? []} cycles={cycles ?? []} questionCount={(questions ?? []).length} />;
}
