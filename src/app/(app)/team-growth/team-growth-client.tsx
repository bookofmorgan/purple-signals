"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Quote } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CycleEyebrow } from "@/components/dashboard/cycle-eyebrow";
import { KeyUnlocks } from "@/components/dashboard/key-unlocks";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import type { DashboardScoresPayload, DashboardScoresInsufficient } from "@/lib/types";

interface Signal { comment: string; category: string }
type Scores = DashboardScoresPayload | DashboardScoresInsufficient;

export default function TeamGrowthClient() {
  const [scores, setScores] = useState<Scores | null>(null);
  const [signals, setSignals] = useState<Signal[] | null>(null);
  const [descMap, setDescMap] = useState<Map<string, string | null>>(new Map());

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/scores").then((r) => r.json()),
      fetch("/api/dashboard/signals").then((r) => r.json()),
      fetch("/api/dashboard/categories").then((r) => r.ok ? r.json() : { categories: [] })
    ]).then(([s, sig, cats]) => {
      setScores(s);
      setSignals(sig.signals ?? []);
      const m = new Map<string, string | null>();
      for (const c of (cats.categories ?? [])) m.set(c.id, c.description);
      setDescMap(m);
    });
  }, []);

  if (!scores) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const hasScores = !("insufficient_responses" in scores);

  return (
    <div className="space-y-6">
      <CycleEyebrow
        title="Team Growth"
        cycle={hasScores ? { title: scores.cycle.title, status: "Closed", cadence: "Monthly pulse" } : null}
      />

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        {/* Team Signals card */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Quote className="h-4 w-4 text-primary" />
                Team Signals
              </CardTitle>
              <CardDescription>Anonymous voices from your team this cycle.</CardDescription>
            </div>
            <Link href="/signals" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
              View all signals <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {signals === null && <p className="text-sm text-muted-foreground">Loading…</p>}
            {signals && signals.length === 0 && (
              <p className="text-sm text-muted-foreground">No comments left this cycle.</p>
            )}
            <ul className="space-y-3">
              {signals?.slice(0, 4).map((s, i) => (
                <li key={i} className="border rounded-lg p-3 border-l-4 border-l-primary">
                  <p className="text-sm leading-relaxed">{s.comment}</p>
                  <Badge variant="outline" className="mt-2 text-[10px] uppercase tracking-wide">
                    {s.category}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Key Unlocks */}
        {hasScores && <KeyUnlocks categories={scores.categories} />}
      </div>

      {hasScores && (
        <NeedsAttention
          categories={scores.categories.map((c) => ({ ...c, description: descMap.get(c.id) ?? null }))}
        />
      )}
    </div>
  );
}
