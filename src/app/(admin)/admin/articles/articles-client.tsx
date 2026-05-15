"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Article, Category } from "@/lib/types";

export default function ArticlesClient({
  initialArticles, categories
}: { initialArticles: Article[]; categories: Category[] }) {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [readTime, setReadTime] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    const res = await fetch("/api/admin/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, description: description || null, url,
        category_id: categoryId === "none" ? null : categoryId,
        read_time_min: readTime ? parseInt(readTime, 10) : null
      })
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(json.error ?? "Failed"); return; }
    setArticles([json.article, ...articles]);
    setTitle(""); setDescription(""); setUrl(""); setReadTime("");
  }

  async function toggleActive(a: Article) {
    await fetch(`/api/admin/articles/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !a.is_active })
    });
    router.refresh();
  }

  async function remove(a: Article) {
    await fetch(`/api/admin/articles/${a.id}`, { method: "DELETE" });
    setArticles(articles.filter((x) => x.id !== a.id));
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Articles</h1>
        <p className="text-muted-foreground">Surfaced on employee dashboards filtered by the team's weakest category.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Add article</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input id="url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rt">Read time (minutes)</Label>
                <Input id="rt" type="number" min={0} value={readTime} onChange={(e) => setReadTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Add article"}</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">All articles</h2>
        <div className="rounded-lg border divide-y bg-card">
          {articles.length === 0 && <div className="p-6 text-sm text-muted-foreground">No articles yet.</div>}
          {articles.map((a) => {
            const cat = categories.find((c) => c.id === a.category_id);
            return (
              <div key={a.id} className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <a href={a.url} target="_blank" className="font-medium hover:underline">{a.title}</a>
                  <div className="text-xs text-muted-foreground">
                    {cat?.name ?? "no category"} · {a.read_time_min ?? "—"} min · {a.is_active ? "active" : "hidden"}
                  </div>
                  {a.description && <p className="text-sm mt-1 text-muted-foreground">{a.description}</p>}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(a)}>
                    {a.is_active ? "Hide" : "Show"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(a)}>Delete</Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
