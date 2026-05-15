import { createAdminClient } from "@/lib/supabase/admin";
import ArticlesClient from "./articles-client";

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  const admin = createAdminClient();
  const [{ data: articles }, { data: categories }] = await Promise.all([
    admin.from("articles").select("*").order("sort_order"),
    admin.from("categories").select("*").order("sort_order")
  ]);
  return <ArticlesClient initialArticles={articles ?? []} categories={categories ?? []} />;
}
