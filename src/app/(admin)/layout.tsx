import { requireRole } from "@/lib/auth-helpers";
import { AppShell } from "@/components/app-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole(["super_admin"]);
  return (
    <AppShell role={profile.role} name={profile.name} title={profile.title} orgName={null}>
      <div className="p-6 md:p-10 max-w-7xl">{children}</div>
    </AppShell>
  );
}
