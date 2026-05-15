import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser, badRequest } from "@/lib/api-helpers";

const Body = z.object({ title: z.string().max(120).optional() });

export async function GET() {
  const ctx = await requireApiUser();
  if (!ctx.ok) return ctx.res;
  const { data, error } = await ctx.supabase
    .from("coach_conversations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversations: data });
}

export async function POST(req: Request) {
  const ctx = await requireApiUser();
  if (!ctx.ok) return ctx.res;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { data, error } = await ctx.supabase
    .from("coach_conversations")
    .insert({ user_id: ctx.userId, title: parsed.data.title ?? null })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ conversation: data });
}
