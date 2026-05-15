import { requireUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser();
  if (profile.role === "super_admin") redirect("/admin");

  const supabase = await createClient();
  const { data: org } = profile.org_id
    ? await supabase.from("orgs").select("name").eq("id", profile.org_id).single()
    : { data: null };

  return (
    <AppShell role={profile.role} name={profile.name} title={profile.title} orgName={org?.name ?? null}>
      <div className="p-6 md:p-10 max-w-7xl">{children}</div>
    </AppShell>
  );
}
