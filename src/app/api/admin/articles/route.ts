import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, badRequest } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";

const Body = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).nullable().optional(),
  url: z.string().url(),
  category_id: z.string().uuid().nullable().optional(),
  read_time_min: z.number().int().min(0).max(600).nullable().optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional()
});

export async function GET() {
  const ctx = await requireApiRole(["super_admin"]);
  if (!ctx.ok) return ctx.res;
  const admin = createAdminClient();
  const { data, error } = await admin.from("articles").select("*").order("sort_order", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ articles: data });
}

export async function POST(req: Request) {
  const ctx = await requireApiRole(["super_admin"]);
  if (!ctx.ok) return ctx.res;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);
  const admin = createAdminClient();
  const { data, error } = await admin.from("articles").insert(parsed.data).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ article: data });
}
