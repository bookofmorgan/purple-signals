import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { AppUser, Role } from "@/lib/types";

/**
 * Require an authed user with a profile row for an API route.
 * Returns NextResponse on failure, ctx on success.
 */
export async function requireApiUser(): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; profile: AppUser; userId: string }
  | { ok: false; res: NextResponse }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single<AppUser>();

  if (!profile) return { ok: false, res: NextResponse.json({ error: "No profile" }, { status: 403 }) };
  return { ok: true, supabase, profile, userId: user.id };
}

export async function requireApiRole(allowed: Role[]) {
  const ctx = await requireApiUser();
  if (!ctx.ok) return ctx;
  if (!allowed.includes(ctx.profile.role)) {
    return { ok: false as const, res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return ctx;
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
