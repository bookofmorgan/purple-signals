import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-helpers";
import type { EmployeeDashboardPayload } from "@/lib/types";

export async function GET() {
  const ctx = await requireApiUser();
  if (!ctx.ok) return ctx.res;
  const { supabase, profile } = ctx;

  const { data: cycle } = await supabase
    .from("cycles")
    .select("id, title, ends_at")
    .eq("status", "closed")
    .eq("org_id", profile.org_id ?? "")
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!cycle) {
    return NextResponse.json({ insufficient_responses: true, cycle: null, response_rate: { responded: 0, total: 0, rate: 0 } });
  }

  const { data: rows } = await supabase.rpc("get_employee_dashboard", { p_cycle_id: cycle.id });
  type Row = {
    overall_score: number;
    strongest_name: string;
    strongest_score: number;
    weakest_name: string;
    weakest_score: number;
    weakest_category: string | null;
  };
  const summary = (rows as Row[] | null)?.[0];

  if (!summary || summary.overall_score == null) {
    const { data: rate } = await supabase.rpc("get_response_rate", { p_cycle_id: cycle.id });
    return NextResponse.json({
      insufficient_responses: true,
      cycle,
      response_rate: rate?.[0] ?? { responded: 0, total: 0, rate: 0 }
    });
  }

  // Recommended articles for the weakest category
  let articles: EmployeeDashboardPayload["recommended_articles"] = [];
  if (summary.weakest_category) {
    const { data: a } = await supabase
      .from("articles")
      .select("id, title, description, url, read_time_min")
      .eq("category_id", summary.weakest_category)
      .eq("is_active", true)
      .order("sort_order")
      .limit(5);
    articles = a ?? [];
  }

  // Fallback: if no category-tagged articles, surface a few general ones.
  if (articles.length === 0) {
    const { data: a } = await supabase
      .from("articles")
      .select("id, title, description, url, read_time_min")
      .eq("is_active", true)
      .order("sort_order")
      .limit(3);
    articles = a ?? [];
  }

  const payload: EmployeeDashboardPayload = {
    overall_score: Number(summary.overall_score),
    strongest: { name: summary.strongest_name, score: Number(summary.strongest_score) },
    weakest:   { name: summary.weakest_name,   score: Number(summary.weakest_score) },
    recommended_articles: articles,
    cycle
  };
  return NextResponse.json(payload);
}
