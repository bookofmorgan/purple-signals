import { requireRole } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import ArticlesClient from "./articles-client";

export const dynamic = "force-dynamic";

export default async function ArticlesPage() {
  await requireRole(["leader", "employee"]);
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("*").order("sort_order");
  return <ArticlesClient categories={categories ?? []} />;
}
