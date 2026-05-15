"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users2, Building2, ClipboardList, Sparkles,
  TrendingUp, MessageSquare, Compass, BookOpen, LogOut, UsersRound
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

interface NavItem { href: string; label: string; icon: React.ReactNode }

function navForRole(role: Role): { groups: { label: string | null; items: NavItem[] }[] } {
  if (role === "super_admin") {
    return {
      groups: [{
        label: "ADMIN",
        items: [
          { href: "/admin",          label: "Overview",  icon: <LayoutDashboard className="h-4 w-4" /> },
          { href: "/admin/orgs",     label: "Orgs",      icon: <Building2 className="h-4 w-4" /> },
          { href: "/admin/users",    label: "Users",     icon: <Users2 className="h-4 w-4" /> },
          { href: "/admin/cycles",   label: "Cycles",    icon: <ClipboardList className="h-4 w-4" /> },
          { href: "/admin/articles", label: "Articles",  icon: <BookOpen className="h-4 w-4" /> }
        ]
      }]
    };
  }

  const isLeader = role === "leader";

  return {
    groups: [
      {
        label: "LEADERSHIP HEALTH",
        items: [
          isLeader
            ? { href: "/dashboard", label: "Dashboard",   icon: <LayoutDashboard className="h-4 w-4" /> }
            : { href: "/team",      label: "Team Health", icon: <LayoutDashboard className="h-4 w-4" /> },
          { href: "/trends",  label: "Trends",  icon: <TrendingUp className="h-4 w-4" /> },
          { href: "/signals", label: "Signals", icon: <MessageSquare className="h-4 w-4" /> }
        ]
      },
      {
        label: "GROWTH",
        items: [
          ...(isLeader
            ? [{ href: "/team-growth", label: "Team Growth", icon: <UsersRound className="h-4 w-4" /> }]
            : []),
          { href: "/growth", label: "Individual Growth", icon: <Compass className="h-4 w-4" /> }
        ]
      },
      {
        label: null,
        items: [
          { href: "/survey", label: "Take the pulse", icon: <Sparkles className="h-4 w-4" /> }
        ]
      }
    ]
  };
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
}

export function AppShell({
  role, name, title, orgName, children
}: {
  role: Role;
  name: string;
  title: string | null;
  orgName: string | null;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const { groups } = navForRole(role);
  const isLeader = role === "leader";

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="h-screen flex bg-secondary/30 overflow-hidden">
      <aside className="hidden md:flex w-64 flex-col border-r bg-card h-screen sticky top-0">
        {/* Brand */}
        <div className="p-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary grid place-items-center text-primary-foreground font-bold text-lg shadow-sm">
            P
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight">Purple Signals</div>
            <div className="text-xs text-muted-foreground leading-tight">Clear signals. Aligned teams.</div>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="px-3 flex-1 overflow-y-auto py-2 space-y-5">
          {groups.map((g, gi) => (
            <div key={gi} className="space-y-1">
              {g.label && (
                <div className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground">
                  {g.label}
                </div>
              )}
              {g.items.map((it) => {
                const active = path === it.href ||
                  (it.href !== "/admin" && it.href !== "/" && path?.startsWith(it.href + "/"));
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {it.icon}
                    <span>{it.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* View-as toggle (leader only — quick way to demo the employee view) */}
        {isLeader && (
          <div className="px-3 pb-3 space-y-2">
            <div className="text-[10px] font-semibold tracking-wider text-muted-foreground px-2">VIEW AS</div>
            <div className="flex gap-1 p-1 rounded-full bg-secondary text-xs">
              <Link
                href="/dashboard"
                className={cn(
                  "flex-1 text-center px-3 py-1.5 rounded-full transition-colors",
                  path === "/dashboard"
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Leadership
              </Link>
              <Link
                href="/team"
                className={cn(
                  "flex-1 text-center px-3 py-1.5 rounded-full transition-colors",
                  path === "/team"
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Employee
              </Link>
            </div>
          </div>
        )}

        {/* User card */}
        <div className="border-t p-3">
          <div className="flex items-center gap-3 rounded-lg bg-primary/5 p-2.5">
            <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center font-semibold text-xs shrink-0">
              {initials(name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-primary leading-tight truncate">{name}</div>
              <div className="text-xs text-muted-foreground leading-tight truncate">
                {[title, orgName].filter(Boolean).join(" · ") || role.replace("_", " ")}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={signOut} title="Sign out">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 bg-background overflow-y-auto">{children}</main>
    </div>
  );
}
