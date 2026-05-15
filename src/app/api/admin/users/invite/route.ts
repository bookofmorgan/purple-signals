import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, badRequest } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";

const Invite = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80),
  role: z.enum(["leader", "employee"]),
  org_id: z.string().uuid()
});

const Body = z.object({
  invites: z.array(Invite).min(1).max(50)
});

export async function POST(req: Request) {
  const ctx = await requireApiRole(["super_admin"]);
  if (!ctx.ok) return ctx.res;

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const results: Array<{ email: string; ok: boolean; error?: string; user_id?: string; invite_link?: string }> = [];

  for (const invite of parsed.data.invites) {
    // 1) Send Supabase invite email (works only when SMTP is configured; otherwise
    //    Supabase Studio's Inbucket shows the link in local dev).
    const { data, error } = await admin.auth.admin.inviteUserByEmail(invite.email, {
      redirectTo: `${appUrl}/accept-invite`,
      data: { name: invite.name }
    });

    if (error || !data.user) {
      results.push({ email: invite.email, ok: false, error: error?.message ?? "unknown" });
      continue;
    }

    // 2) Create the public.users profile row tied to the new auth user.
    const { error: profErr } = await admin.from("users").insert({
      id: data.user.id,
      org_id: invite.org_id,
      email: invite.email,
      name: invite.name,
      role: invite.role
    });

    if (profErr) {
      results.push({ email: invite.email, ok: false, error: profErr.message });
      continue;
    }

    // 3) For local dev where SMTP isn't wired up, also generate a magic link
    //    we can show the admin so they can hand it to the user manually.
    const { data: link } = await admin.auth.admin.generateLink({
      type: "invite",
      email: invite.email,
      options: { redirectTo: `${appUrl}/accept-invite` }
    });

    results.push({
      email: invite.email,
      ok: true,
      user_id: data.user.id,
      invite_link: link?.properties?.action_link
    });
  }

  return NextResponse.json({ results });
}
