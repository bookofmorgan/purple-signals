import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole, badRequest } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";

const Body = z.object({
  org_id: z.string().uuid(),
  title: z.string().min(2).max(100),
  starts_at: z.string().min(8),
  ends_at: z.string().min(8),
  question_ids: z.array(z.string().uuid()).optional()
});

export async function GET(req: Request) {
  const ctx = await requireApiRole(["super_admin"]);
  if (!ctx.ok) return ctx.res;
  const url = new URL(req.url);
  const orgId = url.searchParams.get("org_id");

  const admin = createAdminClient();
  let q = admin.from("cycles").select("*").order("created_at", { ascending: false });
  if (orgId) q = q.eq("org_id", orgId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cycles: data });
}

export async function POST(req: Request) {
  const ctx = await requireApiRole(["super_admin"]);
  if (!ctx.ok) return ctx.res;
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const admin = createAdminClient();
  const { data: cycle, error } = await admin
    .from("cycles")
    .insert({
      org_id: parsed.data.org_id,
      title: parsed.data.title,
      starts_at: parsed.data.starts_at,
      ends_at: parsed.data.ends_at,
      status: "draft"
    })
    .select()
    .single();
  if (error || !cycle) return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 400 });

  // Bind questions: caller-provided list, otherwise all active questions.
  let questionIds = parsed.data.question_ids;
  if (!questionIds || questionIds.length === 0) {
    const { data: qs } = await admin.from("questions").select("id").eq("is_active", true);
    questionIds = (qs ?? []).map((q) => q.id);
  }

  if (questionIds.length > 0) {
    const { error: cqErr } = await admin
      .from("cycle_questions")
      .insert(questionIds.map((qid) => ({ cycle_id: cycle.id, question_id: qid })));
    if (cqErr) return NextResponse.json({ error: cqErr.message }, { status: 500 });
  }

  return NextResponse.json({ cycle });
}
