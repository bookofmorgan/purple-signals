import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-helpers";

interface Row {
  cycle_id: string;
  cycle_title: string;
  ends_at: string;
  category_id: string;
  category_name: string;
  sort_order: number;
  avg_score: number;
}

export async function GET() {
  const ctx = await requireApiUser();
  if (!ctx.ok) return ctx.res;
  const { data, error } = await ctx.supabase.rpc("get_category_trends_across_cycles");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data as Row[] | null) ?? [];

  // Collapse rows into one timeseries per category, ordered by ends_at.
  const byCategory = new Map<string, {
    category_id: string;
    category_name: string;
    sort_order: number;
    points: { cycle_id: string; cycle_title: string; ends_at: string; score: number }[];
  }>();
  for (const r of rows) {
    if (!byCategory.has(r.category_id)) {
      byCategory.set(r.category_id, {
        category_id: r.category_id,
        category_name: r.category_name,
        sort_order: r.sort_order,
        points: []
      });
    }
    byCategory.get(r.category_id)!.points.push({
      cycle_id: r.cycle_id,
      cycle_title: r.cycle_title,
      ends_at: r.ends_at,
      score: Number(r.avg_score)
    });
  }

  const categories = Array.from(byCategory.values()).sort((a, b) => a.sort_order - b.sort_order);

  // Distinct cycles (for the overall chart's x-axis), chronological order.
  const cycleMap = new Map<string, { id: string; title: string; ends_at: string }>();
  for (const r of rows) {
    if (!cycleMap.has(r.cycle_id)) {
      cycleMap.set(r.cycle_id, { id: r.cycle_id, title: r.cycle_title, ends_at: r.ends_at });
    }
  }
  const cycles = Array.from(cycleMap.values()).sort((a, b) => a.ends_at.localeCompare(b.ends_at));

  // Overall score per cycle = average across categories that cycle.
  const overallByCycle = cycles.map((c) => {
    const cycleRows = rows.filter((r) => r.cycle_id === c.id);
    const avg = cycleRows.length
      ? cycleRows.reduce((s, r) => s + Number(r.avg_score), 0) / cycleRows.length
      : 0;
    return { cycle_id: c.id, cycle_title: c.title, ends_at: c.ends_at, score: Math.round(avg * 10) / 10 };
  });

  return NextResponse.json({ cycles, categories, overall: overallByCycle });
}
