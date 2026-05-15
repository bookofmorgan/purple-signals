import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-helpers";

export async function GET(req: Request) {
  const ctx = await requireApiUser();
  if (!ctx.ok) return ctx.res;
  const { supabase, profile } = ctx;
  const url = new URL(req.url);
  let cycleId = url.searchParams.get("cycle_id");

  if (!cycleId) {
    const { data } = await supabase
      .from("cycles")
      .select("id")
      .eq("status", "closed")
      .eq("org_id", profile.org_id ?? "")
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    cycleId = data?.id ?? null;
  }
  if (!cycleId) return NextResponse.json({ signals: [] });

  const { data } = await supabase.rpc("get_cycle_signals", { p_cycle_id: cycleId });
  type Row = { comment: string; category_name: string };
  const rows = (data as Row[] | null) ?? [];
  return NextResponse.json({
    signals: rows.map((r) => ({ comment: r.comment, category: r.category_name }))
  });
}
