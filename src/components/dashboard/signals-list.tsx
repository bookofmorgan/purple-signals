"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Signal { comment: string; category: string }

export function SignalsList({ cycleId }: { cycleId: string }) {
  const [signals, setSignals] = useState<Signal[] | null>(null);

  useEffect(() => {
    fetch(`/api/dashboard/signals?cycle_id=${cycleId}`)
      .then((r) => r.json())
      .then((j) => setSignals(j.signals ?? []));
  }, [cycleId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Signals</CardTitle>
        <CardDescription>Anonymous comments from this cycle, in random order.</CardDescription>
      </CardHeader>
      <CardContent>
        {signals === null && <p className="text-sm text-muted-foreground">Loading…</p>}
        {signals && signals.length === 0 && <p className="text-sm text-muted-foreground">No comments left this cycle.</p>}
        {signals && signals.length > 0 && (
          <ul className="space-y-3">
            {signals.map((s, i) => (
              <li key={i} className="border rounded-lg p-3 bg-card">
                <Badge variant="outline" className="mb-2 text-xs">{s.category}</Badge>
                <p className="text-sm leading-relaxed">{s.comment}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
