import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, badRequest } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";

const Body = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, dashes only")
});

export async function GET() {
  const ctx = await requireApiRole(["super_admin"]);
  if (!ctx.ok) return ctx.res;
  const admin = createAdminClient();
  const { data, error } = await admin.from("orgs").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orgs: data });
}

export async function POST(req: Request) {
  const ctx = await requireApiRole(["super_admin"]);
  if (!ctx.ok) return ctx.res;
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const admin = createAdminClient();
  const { data, error } = await admin.from("orgs").insert(parsed.data).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ org: data });
}
