import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-helpers";
import type { CategoryTrend, ResponseRate, DashboardScoresPayload, DashboardScoresInsufficient } from "@/lib/types";

export async function GET(req: Request) {
  const ctx = await requireApiUser();
  if (!ctx.ok) return ctx.res;
  const { supabase, profile } = ctx;

  const url = new URL(req.url);
  const cycleId = url.searchParams.get("cycle_id");

  // If no cycle_id supplied, pick the most recent closed cycle for this org.
  let resolvedCycleId = cycleId;
  let cycleRow: { id: string; title: string; ends_at: string } | null = null;
  if (!resolvedCycleId) {
    const { data } = await supabase
      .from("cycles")
      .select("id, title, ends_at")
      .eq("status", "closed")
      .eq("org_id", profile.org_id ?? "")
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    cycleRow = data;
    resolvedCycleId = data?.id ?? null;
  } else {
    const { data } = await supabase
      .from("cycles")
      .select("id, title, ends_at")
      .eq("id", resolvedCycleId)
      .maybeSingle();
    cycleRow = data;
  }

  if (!resolvedCycleId) {
    return NextResponse.json({ insufficient_responses: true, response_rate: { responded: 0, total: 0, rate: 0 }, cycle: null } satisfies DashboardScoresInsufficient);
  }

  const [{ data: trends }, { data: rateRows }] = await Promise.all([
    supabase.rpc("get_cycle_trends",  { p_cycle_id: resolvedCycleId }),
    supabase.rpc("get_response_rate", { p_cycle_id: resolvedCycleId })
  ]);

  const rate: ResponseRate = (rateRows && rateRows[0]) ?? { responded: 0, total: 0, rate: 0 };

  if (!trends || (trends as CategoryTrend[]).length === 0) {
    return NextResponse.json({
      insufficient_responses: true,
      response_rate: rate,
      cycle: cycleRow
    } satisfies DashboardScoresInsufficient);
  }

  const t = trends as CategoryTrend[];
  const overall = Math.round((t.reduce((s, c) => s + Number(c.current_score), 0) / t.length) * 10) / 10;
  const strong = t.filter((c) => c.status === "strong").length;

  const payload: DashboardScoresPayload = {
    overall_score: overall,
    categories: t.map((c) => ({
      id: c.category_id, name: c.category_name,
      score: Number(c.current_score), delta: Number(c.delta), status: c.status
    })),
    response_rate: rate,
    strong_areas: strong,
    cycle: cycleRow!
  };
  return NextResponse.json(payload);
}
