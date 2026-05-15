import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users2, ClipboardList, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const admin = createAdminClient();
  const [{ count: orgCount }, { count: userCount }, { count: cycleCount }, { count: openCycleCount }] =
    await Promise.all([
      admin.from("orgs").select("*", { count: "exact", head: true }),
      admin.from("users").select("*", { count: "exact", head: true }),
      admin.from("cycles").select("*", { count: "exact", head: true }),
      admin.from("cycles").select("*", { count: "exact", head: true }).eq("status", "open")
    ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Admin overview</h1>
        <p className="text-muted-foreground">Operate orgs, users, and survey cycles.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Orgs"        value={orgCount ?? 0}        icon={<Building2 className="h-5 w-5" />} />
        <Stat label="Users"       value={userCount ?? 0}       icon={<Users2 className="h-5 w-5" />} />
        <Stat label="Cycles"      value={cycleCount ?? 0}      icon={<ClipboardList className="h-5 w-5" />} />
        <Stat label="Open cycles" value={openCycleCount ?? 0}  icon={<BookOpen className="h-5 w-5" />} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ShortcutCard href="/admin/orgs"    title="Create or manage orgs" desc="Spin up a new pilot org or rename existing ones." />
        <ShortcutCard href="/admin/users"   title="Invite users"          desc="Bulk-invite employees and leaders into an org." />
        <ShortcutCard href="/admin/cycles"  title="Run a cycle"           desc="Create, open, and close survey cycles." />
        <ShortcutCard href="/admin/articles" title="Curate articles"      desc="Add leadership reading recommended on dashboards." />
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
        <div className="text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function ShortcutCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="block group">
      <Card className="transition-shadow group-hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </CardHeader>
      </Card>
    </Link>
  );
}
