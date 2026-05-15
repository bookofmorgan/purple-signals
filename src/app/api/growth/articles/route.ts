import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-helpers";

export async function GET(req: Request) {
  const ctx = await requireApiUser();
  if (!ctx.ok) return ctx.res;
  const url = new URL(req.url);
  const categoryId = url.searchParams.get("category_id");

  let q = ctx.supabase
    .from("articles")
    .select("*, categories(name)")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (categoryId) q = q.eq("category_id", categoryId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ articles: data });
}
