import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser, badRequest } from "@/lib/api-helpers";

const Body = z.object({
  cycle_id: z.string().uuid(),
  responses: z.array(z.object({
    question_id: z.string().uuid(),
    score: z.number().int().min(1).max(10),
    comment: z.string().max(2000).optional().nullable()
  })).min(1)
});

export async function POST(req: Request) {
  const ctx = await requireApiUser();
  if (!ctx.ok) return ctx.res;
  const { supabase, userId } = ctx;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  // Verify cycle is open and belongs to caller's org. RLS will refuse the insert
  // otherwise, but we want a clean 403/404 error message.
  const { data: cycle } = await supabase
    .from("cycles")
    .select("id, status, org_id")
    .eq("id", parsed.data.cycle_id)
    .maybeSingle();

  if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
  if (cycle.status !== "open") return NextResponse.json({ error: "Cycle is not open" }, { status: 403 });

  const { count: alreadyCount } = await supabase
    .from("responses")
    .select("id", { count: "exact", head: true })
    .eq("cycle_id", parsed.data.cycle_id)
    .eq("user_id", userId);
  if ((alreadyCount ?? 0) > 0) {
    return NextResponse.json({ error: "Already submitted for this cycle" }, { status: 409 });
  }

  const rows = parsed.data.responses.map((r) => ({
    cycle_id: parsed.data.cycle_id,
    question_id: r.question_id,
    user_id: userId,
    score: r.score,
    comment: r.comment ?? null
  }));

  const { error } = await supabase.from("responses").insert(rows);
  if (error) {
    if (error.code === "23505") {
      // unique violation = double-submit
      return NextResponse.json({ error: "Already submitted for this cycle" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
