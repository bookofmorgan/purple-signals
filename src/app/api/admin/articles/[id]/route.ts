import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, badRequest } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";

const Patch = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  url: z.string().url().optional(),
  category_id: z.string().uuid().nullable().optional(),
  read_time_min: z.number().int().min(0).max(600).nullable().optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional()
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiRole(["super_admin"]);
  if (!ctx.ok) return ctx.res;
  const { id } = await params;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);
  const admin = createAdminClient();
  const { data, error } = await admin.from("articles").update(parsed.data).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ article: data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiRole(["super_admin"]);
  if (!ctx.ok) return ctx.res;
  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from("articles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
