import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppUser, Role } from "@/lib/types";

export function roleLandingPath(role: string | null | undefined): string {
  switch (role) {
    case "super_admin": return "/admin";
    case "leader":      return "/dashboard";
    case "employee":    return "/team";
    default:            return "/login";
  }
}

/**
 * Server-side helper to require an authenticated user with a profile row.
 * Redirects to /login if no user, /login?error=no-profile if user has no public.users row.
 */
export async function requireUser(): Promise<{ user: { id: string; email: string }; profile: AppUser }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single<AppUser>();

  if (!profile) redirect("/login?error=no-profile");
  return { user: { id: user.id, email: user.email ?? "" }, profile };
}

export async function requireRole(allowed: Role[]) {
  const ctx = await requireUser();
  if (!allowed.includes(ctx.profile.role)) {
    redirect(roleLandingPath(ctx.profile.role));
  }
  return ctx;
}
