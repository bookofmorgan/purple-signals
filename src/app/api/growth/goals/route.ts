import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser, badRequest } from "@/lib/api-helpers";

const Body = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(["not_started", "in_progress", "complete"]).optional(),
  target_date: z.string().nullable().optional()
});

export async function GET() {
  const ctx = await requireApiUser();
  if (!ctx.ok) return ctx.res;
  const { data, error } = await ctx.supabase
    .from("dev_plan_goals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ goals: data });
}

export async function POST(req: Request) {
  const ctx = await requireApiUser();
  if (!ctx.ok) return ctx.res;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { data, error } = await ctx.supabase
    .from("dev_plan_goals")
    .insert({
      user_id: ctx.userId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: parsed.data.status ?? "not_started",
      target_date: parsed.data.target_date ?? null
    })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ goal: data });
}
