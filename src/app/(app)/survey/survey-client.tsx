"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles } from "lucide-react";

interface Question {
  id: string; text: string; category_id: string; category_name: string; category_sort: number;
}
interface ActiveResponse {
  cycle: { id: string; title: string; starts_at: string; ends_at: string } | null;
  questions: Question[];
  already_submitted: boolean;
}

export default function SurveyClient() {
  const [data, setData] = useState<ActiveResponse | null>(null);
  const [responses, setResponses] = useState<Record<string, { score: number; comment: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/survey/active").then((r) => r.json()).then(setData);
  }, []);

  const grouped = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { name: string; questions: Question[] }>();
    data.questions.forEach((q) => {
      if (!map.has(q.category_id)) map.set(q.category_id, { name: q.category_name, questions: [] });
      map.get(q.category_id)!.questions.push(q);
    });
    return Array.from(map.values());
  }, [data]);

  function setScore(qid: string, score: number) {
    setResponses((prev) => ({ ...prev, [qid]: { score, comment: prev[qid]?.comment ?? "" } }));
  }
  function setComment(qid: string, comment: string) {
    setResponses((prev) => ({ ...prev, [qid]: { score: prev[qid]?.score ?? 7, comment } }));
  }

  async function onSubmit() {
    if (!data?.cycle) return;
    const missing = data.questions.filter((q) => responses[q.id]?.score === undefined);
    if (missing.length > 0) {
      setError(`Answer all ${data.questions.length} questions (${missing.length} missing).`);
      return;
    }
    setSubmitting(true); setError(null);
    const res = await fetch("/api/survey/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cycle_id: data.cycle.id,
        responses: data.questions.map((q) => ({
          question_id: q.id,
          score: responses[q.id].score,
          comment: responses[q.id].comment?.trim() || null
        }))
      })
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(json.error ?? "Failed"); return; }
    setSubmitted(true);
  }

  if (!data) return <div className="text-sm text-muted-foreground">Loading…</div>;

  if (!data.cycle) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No active cycle</CardTitle>
          <CardDescription>There's no open survey for your team right now. We'll email you when the next one opens.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (data.already_submitted || submitted) {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2 text-strong">
            <Check className="h-5 w-5" />
            <CardTitle>Thanks — your responses are in.</CardTitle>
          </div>
          <CardDescription>
            You're done with the {data.cycle.title}. Aggregate insights will appear on the dashboard once the cycle closes
            and we have at least 8 respondents.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const total = data.questions.length;
  const completed = Object.keys(responses).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            {data.cycle.title}
          </h1>
          <p className="text-muted-foreground text-sm">
            Closes {new Date(data.cycle.ends_at).toLocaleDateString()}. Should take about 3 minutes.
          </p>
        </div>
        <Badge variant="outline">{completed}/{total} answered</Badge>
      </div>

      {grouped.map((g) => (
        <Card key={g.name}>
          <CardHeader>
            <CardTitle className="text-base">{g.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {g.questions.map((q) => {
              const r = responses[q.id];
              return (
                <div key={q.id} className="space-y-3">
                  <p className="font-medium leading-snug">{q.text}</p>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[r?.score ?? 7]}
                      onValueChange={([v]) => setScore(q.id, v)}
                      min={1} max={10} step={1}
                    />
                    <span className="w-10 text-right tabular-nums font-semibold">
                      {r?.score ?? "—"}
                    </span>
                  </div>
                  <Textarea
                    placeholder="Optional context (anonymous)…"
                    value={r?.comment ?? ""}
                    onChange={(e) => setComment(q.id, e.target.value)}
                    rows={2}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end">
        <Button size="lg" onClick={onSubmit} disabled={submitting || completed < total}>
          {submitting ? "Submitting…" : "Submit pulse"}
        </Button>
      </div>
    </div>
  );
}
