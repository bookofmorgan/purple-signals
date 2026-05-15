import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-helpers";

export async function GET() {
  const ctx = await requireApiUser();
  if (!ctx.ok) return ctx.res;
  const { supabase, profile } = ctx;

  // RLS scopes cycles to caller's org automatically.
  const { data: cycle } = await supabase
    .from("cycles")
    .select("id, title, starts_at, ends_at")
    .eq("status", "open")
    .eq("org_id", profile.org_id ?? "")
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!cycle) {
    return NextResponse.json({ cycle: null, questions: [], already_submitted: false });
  }

  const { data: rows } = await supabase
    .from("cycle_questions")
    .select("question_id, questions!inner(id, text, category_id, categories(name, sort_order))")
    .eq("cycle_id", cycle.id);

  type Row = {
    question_id: string;
    questions: {
      id: string; text: string; category_id: string;
      categories: { name: string; sort_order: number } | null;
    } | null;
  };

  const questions = (rows as unknown as Row[] ?? [])
    .filter((r): r is Row & { questions: NonNullable<Row["questions"]> } => !!r.questions)
    .map((r) => ({
      id: r.questions.id,
      text: r.questions.text,
      category_id: r.questions.category_id,
      category_name: r.questions.categories?.name ?? "",
      category_sort: r.questions.categories?.sort_order ?? 0
    }))
    .sort((a, b) => a.category_sort - b.category_sort || a.text.localeCompare(b.text));

  const { data: submittedFlag } = await supabase.rpc("has_user_submitted", { p_cycle_id: cycle.id });

  return NextResponse.json({
    cycle,
    questions,
    already_submitted: !!submittedFlag
  });
}
