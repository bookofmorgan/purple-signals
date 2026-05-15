import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser, badRequest } from "@/lib/api-helpers";

const Patch = z.object({ content: z.string().min(1).max(20000) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiUser();
  if (!ctx.ok) return ctx.res;
  const { id } = await params;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { data, error } = await ctx.supabase
    .from("coaching_notes")
    .update({ content: parsed.data.content, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ note: data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiUser();
  if (!ctx.ok) return ctx.res;
  const { id } = await params;
  const { error } = await ctx.supabase.from("coaching_notes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
