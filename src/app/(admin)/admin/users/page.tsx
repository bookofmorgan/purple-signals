import { createAdminClient } from "@/lib/supabase/admin";
import UsersClient from "./users-client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = createAdminClient();
  const [{ data: orgs }, { data: users }] = await Promise.all([
    admin.from("orgs").select("*").order("created_at", { ascending: false }),
    admin.from("users").select("*").order("created_at", { ascending: false })
  ]);
  return <UsersClient orgs={orgs ?? []} users={users ?? []} />;
}
