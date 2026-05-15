"use client";

import { useEffect, useMemo, useState } from "react";
import { Quote } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CycleEyebrow } from "@/components/dashboard/cycle-eyebrow";

interface Signal { comment: string; category: string }
interface ScoresLite {
  cycle?: { id: string; title: string; ends_at: string } | null;
  insufficient_responses?: boolean;
  response_rate?: { responded: number; total: number; rate: number };
}

export default function SignalsClient() {
  const [signals, setSignals] = useState<Signal[] | null>(null);
  const [meta, setMeta] = useState<ScoresLite | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/signals").then((r) => r.json()),
      fetch("/api/dashboard/scores").then((r) => r.json())
    ]).then(([sig, scores]) => {
      setSignals(sig.signals ?? []);
      setMeta(scores);
    });
  }, []);

  const categories = useMemo(
    () => Array.from(new Set((signals ?? []).map((s) => s.category))).sort(),
    [signals]
  );
  const filtered = useMemo(
    () => (signals ?? []).filter((s) => !filter || s.category === filter),
    [signals, filter]
  );

  return (
    <div className="space-y-6">
      <CycleEyebrow
        title="Signals"
        cycle={meta?.cycle ? { title: meta.cycle.title, status: "Closed", cadence: "Monthly pulse" } : null}
      />

      <Card>
        <CardHeader>
          <CardTitle>Anonymous Team Signals</CardTitle>
          <CardDescription>
            Written comments from this cycle, in random order. No timestamps — protects last-submitter anonymity in small teams.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {signals === null && <div className="text-sm text-muted-foreground">Loading…</div>}

          {signals && categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={!filter ? "default" : "outline"} onClick={() => setFilter(null)}>
                All ({signals.length})
              </Button>
              {categories.map((c) => {
                const n = signals.filter((s) => s.category === c).length;
                return (
                  <Button key={c} size="sm" variant={filter === c ? "default" : "outline"} onClick={() => setFilter(c)}>
                    {c} ({n})
                  </Button>
                );
              })}
            </div>
          )}

          {signals && signals.length === 0 && (
            <p className="text-sm text-muted-foreground">No comments left this cycle.</p>
          )}

          <ul className="space-y-3">
            {filtered.map((s, i) => (
              <li key={i} className="rounded-lg border bg-card p-4">
                <div className="flex items-start gap-3">
                  <Quote className="h-4 w-4 text-primary mt-1 shrink-0" />
                  <div className="space-y-2 min-w-0">
                    <p className="text-sm leading-relaxed">{s.comment}</p>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">{s.category}</Badge>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
