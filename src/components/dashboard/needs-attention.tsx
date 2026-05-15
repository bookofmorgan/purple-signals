"use client";

import { AlertCircle, Users2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  name: string;
  description?: string | null;
  score: number;
  delta: number;
  status: "strong" | "needs_attention" | "stable";
}

export function NeedsAttention({ categories }: { categories: Category[] }) {
  const items = categories.filter((c) => c.status === "needs_attention" || c.score < 6);
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-yellow-200 dark:border-yellow-900 bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-yellow-200 dark:border-yellow-900 bg-yellow-50/60 dark:bg-yellow-950/20">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-yellow-200 dark:bg-yellow-900 grid place-items-center">
            <AlertCircle className="h-4 w-4 text-yellow-700 dark:text-yellow-300" />
          </div>
          <div>
            <div className="font-semibold text-sm">What needs attention</div>
            <div className="text-xs text-muted-foreground">Areas where focused action will move the needle</div>
          </div>
        </div>
      </div>

      <ul className="divide-y">
        {items.map((c) => (
          <li key={c.id} className="px-5 py-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <span className="h-2 w-2 mt-1.5 rounded-full bg-attention" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs tabular-nums px-2 py-0.5 rounded bg-attention/15 text-attention font-medium">
                    {c.score.toFixed(1)}/10
                  </span>
                </div>
                {c.description && (
                  <p className="text-sm text-muted-foreground mt-1 leading-snug">{c.description}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Button variant="outline" size="sm" disabled title="Workflow coming in Phase 4">
                <Users2 className="h-3.5 w-3.5" />
                Discuss as a team
              </Button>
              <Button size="sm" className="bg-attention text-attention-foreground hover:bg-attention/90" disabled title="Workflow coming in Phase 4">
                <UserPlus className="h-3.5 w-3.5" />
                Assign owner
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
