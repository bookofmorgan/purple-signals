import { createAdminClient } from "@/lib/supabase/admin";
import OrgsClient from "./orgs-client";

export const dynamic = "force-dynamic";

export default async function AdminOrgsPage() {
  const admin = createAdminClient();
  const { data: orgs } = await admin.from("orgs").select("*").order("created_at", { ascending: false });
  return <OrgsClient initialOrgs={orgs ?? []} />;
}
