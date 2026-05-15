import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-helpers";

/**
 * Lookup of the 6 leadership category descriptions. Public read via RLS, but we
 * gate behind auth so the route can't be probed anonymously.
 */
export async function GET() {
  const ctx = await requireApiUser();
  if (!ctx.ok) return ctx.res;

  const { data, error } = await ctx.supabase
    .from("categories")
    .select("id, name, description, sort_order")
    .order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ categories: data });
}
