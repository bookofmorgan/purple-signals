import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, badRequest } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";

const Patch = z.object({
  status: z.enum(["draft", "open", "closed"]).optional(),
  title: z.string().min(2).max(100).optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional()
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiRole(["super_admin"]);
  if (!ctx.ok) return ctx.res;
  const { id } = await params;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cycles")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ cycle: data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiRole(["super_admin"]);
  if (!ctx.ok) return ctx.res;
  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from("cycles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
