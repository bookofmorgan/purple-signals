"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CycleEyebrow } from "@/components/dashboard/cycle-eyebrow";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CategorySeries {
  category_id: string;
  category_name: string;
  sort_order: number;
  points: { cycle_id: string; cycle_title: string; ends_at: string; score: number }[];
}
interface OverallPoint { cycle_id: string; cycle_title: string; ends_at: string; score: number }
interface TrendsPayload {
  cycles: { id: string; title: string; ends_at: string }[];
  categories: CategorySeries[];
  overall: OverallPoint[];
}

function deltaBetween(points: { score: number }[]): { from: number; to: number; delta: number } | null {
  if (!points || points.length < 2) {
    if (points && points.length === 1) {
      return { from: points[0].score, to: points[0].score, delta: 0 };
    }
    return null;
  }
  const from = points[points.length - 2].score;
  const to = points[points.length - 1].score;
  return { from, to, delta: Math.round((to - from) * 10) / 10 };
}

function statusFor(score: number): { label: string; variant: "strong" | "attention" | "stable" } {
  if (score >= 7.2) return { label: "Strong", variant: "strong" };
  if (score < 6) return { label: "Needs Attention", variant: "attention" };
  return { label: "Stable", variant: "stable" };
}

export default function TrendsClient() {
  const [data, setData] = useState<TrendsPayload | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/trends").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <div className="text-sm text-muted-foreground">Loading…</div>;

  if (data.cycles.length === 0) {
    return (
      <div className="space-y-6">
        <CycleEyebrow title="Trends" cycle={null} />
        <Card>
          <CardHeader>
            <CardTitle>No closed cycles yet</CardTitle>
            <CardDescription>
              Trend lines populate once at least one cycle has closed with 8+ respondents.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const overallData = data.overall.map((p) => ({ name: p.cycle_title, score: p.score }));
  const overallDelta = deltaBetween(data.overall);

  return (
    <div className="space-y-6">
      <CycleEyebrow
        title="Trends"
        cycle={{ title: `Across ${data.cycles.length} cycle${data.cycles.length === 1 ? "" : "s"}`, cadence: "Monthly pulse" }}
      />

      {/* Overall trend */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Overall Leadership Health</CardTitle>
            <CardDescription>Average across all dimensions, per closed cycle.</CardDescription>
          </div>
          {overallDelta && (
            <DeltaPill delta={overallDelta.delta} />
          )}
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overallData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12
                  }}
                />
                <ReferenceLine y={6}   stroke="hsl(var(--attention))" strokeDasharray="2 4" />
                <ReferenceLine y={7.2} stroke="hsl(var(--strong))"    strokeDasharray="2 4" />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Per-category trends */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Per dimension</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.categories.map((cat) => {
            const series = cat.points.map((p) => ({ name: p.cycle_title, score: p.score }));
            const latest = cat.points[cat.points.length - 1]?.score ?? 0;
            const d = deltaBetween(cat.points);
            const status = statusFor(latest);
            return (
              <Card key={cat.category_id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{cat.category_name}</CardTitle>
                    <Badge variant={status.variant} className="text-[10px] uppercase">{status.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-semibold tabular-nums">{latest.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">/10</span>
                    </div>
                    {d && <DeltaPill delta={d.delta} />}
                  </div>
                  <div className="h-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={series} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <YAxis domain={[0, 10]} hide />
                        <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DeltaPill({ delta }: { delta: number }) {
  const Icon = delta > 0.05 ? TrendingUp : delta < -0.05 ? TrendingDown : Minus;
  const tone = delta > 0.05
    ? "text-strong border-strong/30 bg-strong/5"
    : delta < -0.05
      ? "text-attention border-attention/30 bg-attention/5"
      : "text-muted-foreground border-border bg-secondary/50";
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border tabular-nums ${tone}`}>
      <Icon className="h-3 w-3" />
      {delta > 0 ? "+" : ""}{delta.toFixed(1)}
    </span>
  );
}
