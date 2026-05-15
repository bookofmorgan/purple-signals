"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Cycle, Org } from "@/lib/types";

export default function CyclesClient({
  orgs, cycles, questionCount
}: { orgs: Org[]; cycles: Cycle[]; questionCount: number }) {
  const router = useRouter();
  const [orgId, setOrgId] = useState(orgs[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [endsAt, setEndsAt] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    const res = await fetch("/api/admin/cycles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org_id: orgId,
        title,
        starts_at: new Date(startsAt + "T09:00:00").toISOString(),
        ends_at:   new Date(endsAt   + "T18:00:00").toISOString()
      })
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(json.error ?? "Failed"); return; }
    setTitle("");
    router.refresh();
  }

  async function setStatus(id: string, status: "draft" | "open" | "closed") {
    await fetch(`/api/admin/cycles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Cycles</h1>
        <p className="text-muted-foreground">Each cycle binds the {questionCount} active questions for one survey window.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create cycle</CardTitle>
          <CardDescription>Cycles start as draft. Open them to send the survey, close them to populate the dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="space-y-4 max-w-xl">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Org</Label>
                <Select value={orgId} onValueChange={setOrgId}>
                  <SelectTrigger><SelectValue placeholder="Pick an org" /></SelectTrigger>
                  <SelectContent>
                    {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="June Pulse" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="starts">Starts</Label>
                <Input id="starts" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ends">Ends</Label>
                <Input id="ends" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting || !orgId}>
              {submitting ? "Creating…" : "Create draft cycle"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">All cycles</h2>
        <div className="rounded-lg border divide-y bg-card">
          {cycles.length === 0 && <div className="p-6 text-sm text-muted-foreground">No cycles yet.</div>}
          {cycles.map((c) => {
            const org = orgs.find((o) => o.id === c.org_id);
            return (
              <div key={c.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="font-medium">{c.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {org?.name ?? "—"} · {new Date(c.starts_at).toLocaleDateString()} → {new Date(c.ends_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={c.status === "open" ? "strong" : c.status === "closed" ? "stable" : "secondary"}>
                    {c.status}
                  </Badge>
                  {c.status === "draft" && (
                    <Button size="sm" onClick={() => setStatus(c.id, "open")}>Open</Button>
                  )}
                  {c.status === "open" && (
                    <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "closed")}>Close</Button>
                  )}
                  {c.status === "closed" && (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(c.id, "draft")}>Reopen as draft</Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
