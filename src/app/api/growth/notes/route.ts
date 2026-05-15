import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser, badRequest } from "@/lib/api-helpers";

const Body = z.object({ content: z.string().min(1).max(20000) });

export async function GET() {
  const ctx = await requireApiUser();
  if (!ctx.ok) return ctx.res;
  // RLS scopes to user_id = auth.uid().
  const { data, error } = await ctx.supabase
    .from("coaching_notes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data });
}

export async function POST(req: Request) {
  const ctx = await requireApiUser();
  if (!ctx.ok) return ctx.res;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { data, error } = await ctx.supabase
    .from("coaching_notes")
    .insert({ user_id: ctx.userId, content: parsed.data.content })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ note: data });
}
