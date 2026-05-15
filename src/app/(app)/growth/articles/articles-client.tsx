"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import type { Article, Category } from "@/lib/types";

interface ArticleWithCategory extends Article { categories?: { name: string } | null }

export default function ArticlesClient({ categories }: { categories: Category[] }) {
  const [articles, setArticles] = useState<ArticleWithCategory[] | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    const params = filter ? `?category_id=${filter}` : "";
    fetch(`/api/growth/articles${params}`)
      .then((r) => r.json())
      .then((j) => setArticles(j.articles ?? []));
  }, [filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Articles</h1>
        <p className="text-muted-foreground text-sm">Curated reading on leadership and team dynamics.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={!filter ? "default" : "outline"} onClick={() => setFilter(null)}>All</Button>
        {categories.map((c) => (
          <Button key={c.id} size="sm"
            variant={filter === c.id ? "default" : "outline"}
            onClick={() => setFilter(c.id)}>
            {c.name}
          </Button>
        ))}
      </div>

      {articles === null && <div className="text-sm text-muted-foreground">Loading…</div>}
      {articles && articles.length === 0 && (
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">No articles in this category yet.</CardContent></Card>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {articles?.map((a) => (
          <a key={a.id} href={a.url} target="_blank" rel="noreferrer">
            <Card className="hover:shadow-md transition-shadow h-full">
              <CardContent className="pt-6 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium">{a.title}</div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
                {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {a.categories?.name && <Badge variant="outline">{a.categories.name}</Badge>}
                  {a.read_time_min && <span>{a.read_time_min} min</span>}
                </div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
