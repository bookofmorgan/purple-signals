"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { CycleEyebrow } from "@/components/dashboard/cycle-eyebrow";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { CategoryCard } from "@/components/dashboard/category-card";
import { ResponseRateCard } from "@/components/dashboard/response-rate";
import { KeyUnlocks } from "@/components/dashboard/key-unlocks";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardScoresPayload, DashboardScoresInsufficient } from "@/lib/types";

type Payload = DashboardScoresPayload | DashboardScoresInsufficient | null;

interface CategoryMeta {
  id: string;
  description: string | null;
}

export default function DashboardClient() {
  const [data, setData] = useState<Payload>(null);
  const [meta, setMeta] = useState<CategoryMeta[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/scores").then((r) => r.json()),
      fetch("/api/dashboard/categories").then((r) => r.ok ? r.json() : { categories: [] })
    ]).then(([scores, cats]) => {
      setData(scores);
      setMeta(cats.categories ?? []);
    });
  }, []);

  if (!data) return <div className="text-sm text-muted-foreground">Loading…</div>;

  if ("insufficient_responses" in data) {
    return (
      <div className="space-y-6">
        <CycleEyebrow title="Leadership Health" cycle={data.cycle ? { title: data.cycle.title, status: "Awaiting threshold", cadence: "Monthly pulse" } : null} />
        <Card>
          <CardHeader>
            <CardTitle>Not enough responses yet</CardTitle>
            <CardDescription>
              We protect anonymity by holding all aggregate data until at least 8 distinct people have responded.
              {data.cycle && <> Current cycle: <strong>{data.cycle.title}</strong>.</>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponseRateCard {...data.response_rate} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Overall delta: average of all category deltas as a proxy.
  const overallDelta = data.categories.length
    ? Math.round(
        (data.categories.reduce((s, c) => s + Number(c.delta), 0) / data.categories.length) * 10
      ) / 10
    : null;

  // Merge category descriptions in from the meta call.
  const descById = new Map(meta.map((m) => [m.id, m.description]));

  return (
    <div className="space-y-6">
      <CycleEyebrow
        title="Leadership Health"
        cycle={{ title: data.cycle.title, status: "Closed", cadence: "Monthly pulse" }}
      />

      <DashboardHero
        overall={Number(data.overall_score)}
        overallDelta={overallDelta}
        responseRate={data.response_rate}
        strongAreas={data.strong_areas}
        totalAreas={data.categories.length}
      />

      <div>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">Leadership Dimensions</h2>
            <p className="text-sm text-muted-foreground">Six areas that shape how leadership works in practice.</p>
          </div>
          <Link href="/trends" className="text-sm text-primary inline-flex items-center gap-1 hover:underline">
            View trends <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.categories.map((c) => (
            <CategoryCard
              key={c.id}
              name={c.name}
              description={descById.get(c.id) ?? null}
              score={c.score}
              delta={c.delta}
              status={c.status}
            />
          ))}
        </div>
      </div>

      <KeyUnlocks categories={data.categories} />

      <NeedsAttention
        categories={data.categories.map((c) => ({
          ...c,
          description: descById.get(c.id) ?? null
        }))}
      />
    </div>
  );
}
