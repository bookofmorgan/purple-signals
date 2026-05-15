"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Org } from "@/lib/types";

export default function OrgsClient({ initialOrgs }: { initialOrgs: Org[] }) {
  const [orgs, setOrgs] = useState<Org[]>(initialOrgs);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function slugify(v: string) {
    return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    const res = await fetch("/api/admin/orgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: slug || slugify(name) })
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(json.error ?? "Failed"); return; }
    setOrgs([json.org, ...orgs]);
    setName(""); setSlug("");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Organisations</h1>
        <p className="text-muted-foreground">Each pilot team gets its own org. Data is fully isolated by RLS.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create org</CardTitle>
          <CardDescription>Slug is shown nowhere user-facing yet — it just identifies the tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4 max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting || !name}>
              {submitting ? "Creating…" : "Create org"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">All orgs</h2>
        <div className="rounded-lg border divide-y bg-card">
          {orgs.length === 0 && <div className="p-6 text-sm text-muted-foreground">No orgs yet.</div>}
          {orgs.map((o) => (
            <div key={o.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{o.name}</div>
                <div className="text-xs text-muted-foreground">{o.slug} · {new Date(o.created_at).toLocaleDateString()}</div>
              </div>
              <code className="text-xs text-muted-foreground">{o.id.slice(0, 8)}…</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
