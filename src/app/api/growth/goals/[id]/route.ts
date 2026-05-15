import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser, badRequest } from "@/lib/api-helpers";

const Patch = z.object({
  title: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(["not_started", "in_progress", "complete"]).optional(),
  target_date: z.string().nullable().optional()
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiUser();
  if (!ctx.ok) return ctx.res;
  const { id } = await params;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);
  const { data, error } = await ctx.supabase
    .from("dev_plan_goals")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ goal: data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiUser();
  if (!ctx.ok) return ctx.res;
  const { id } = await params;
  const { error } = await ctx.supabase.from("dev_plan_goals").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
