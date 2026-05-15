"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Sparkles, Sprout, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CycleEyebrow } from "@/components/dashboard/cycle-eyebrow";
import { ResponseRateCard } from "@/components/dashboard/response-rate";
import type { EmployeeDashboardPayload } from "@/lib/types";

type Payload =
  | EmployeeDashboardPayload
  | {
      insufficient_responses: true;
      cycle: { id: string; title: string; ends_at: string } | null;
      response_rate: { responded: number; total: number; rate: number };
    }
  | null;

export default function TeamClient() {
  const [data, setData] = useState<Payload>(null);

  useEffect(() => {
    fetch("/api/dashboard/employee").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <div className="text-sm text-muted-foreground">Loading…</div>;

  if ("insufficient_responses" in data) {
    return (
      <div className="space-y-6">
        <CycleEyebrow title="Team Health" cycle={data.cycle ? { title: data.cycle.title, status: "Awaiting threshold", cadence: "Monthly pulse" } : null} />
        <Card>
          <CardHeader>
            <CardTitle>Awaiting more responses</CardTitle>
            <CardDescription>
              Aggregate scores appear once at least 8 people have submitted. Your responses are anonymous.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponseRateCard {...data.response_rate} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CycleEyebrow
        title="Team Health"
        cycle={{ title: data.cycle.title, status: "Closed", cadence: "Monthly pulse" }}
      />

      <Card className="p-6 md:p-8">
        <div className="text-[11px] font-semibold tracking-wider text-muted-foreground">
          OVERALL TEAM HEALTH
        </div>
        <div className="flex items-end gap-3 mt-1">
          <div className="text-6xl font-semibold tabular-nums tracking-tight leading-none">
            {data.overall_score.toFixed(1)}
          </div>
          <div className="text-muted-foreground pb-1.5">/ 10</div>
        </div>
        <div className="text-sm text-muted-foreground mt-2">
          From the {data.cycle.title}. Your responses remain anonymous.
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {data.strongest && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-strong">
                <Sparkles className="h-4 w-4" />
                <CardTitle className="text-xs uppercase tracking-wider text-strong">One strong area</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{data.strongest.name}</div>
              <Badge variant="strong" className="mt-2">{data.strongest.score.toFixed(1)} / 10</Badge>
            </CardContent>
          </Card>
        )}
        {data.weakest && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-attention">
                <Sprout className="h-4 w-4" />
                <CardTitle className="text-xs uppercase tracking-wider text-attention">One area to work on</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{data.weakest.name}</div>
              <Badge variant="attention" className="mt-2">{data.weakest.score.toFixed(1)} / 10</Badge>
            </CardContent>
          </Card>
        )}
      </div>

      {data.recommended_articles.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Recommended reading</h2>
          <Card>
            <ul className="divide-y">
              {data.recommended_articles.map((a) => (
                <li key={a.id}>
                  <a href={a.url} target="_blank" rel="noreferrer"
                     className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-accent/40 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-yellow-100 grid place-items-center shrink-0">
                        <FileText className="h-4 w-4 text-yellow-700" />
                      </div>
                      <div>
                        <div className="font-medium">{a.title}</div>
                        {a.description && <p className="text-sm text-muted-foreground line-clamp-2">{a.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {a.read_time_min && <span className="text-xs text-muted-foreground tabular-nums">{a.read_time_min} min</span>}
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
