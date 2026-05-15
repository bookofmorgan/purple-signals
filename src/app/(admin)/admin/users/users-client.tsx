"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Org, AppUser } from "@/lib/types";

interface InviteResult {
  email: string;
  ok: boolean;
  error?: string;
  invite_link?: string;
}

export default function UsersClient({ orgs, users }: { orgs: Org[]; users: AppUser[] }) {
  const [orgId, setOrgId] = useState<string>(orgs[0]?.id ?? "");
  const [bulkText, setBulkText] = useState("");
  const [defaultRole, setDefaultRole] = useState<"leader" | "employee">("employee");
  const [results, setResults] = useState<InviteResult[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parseInvites(): { email: string; name: string; role: "leader" | "employee" }[] {
    return bulkText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        const email = parts[0];
        const name = parts[1] || email.split("@")[0];
        const role = (parts[2] === "leader" ? "leader" : defaultRole) as "leader" | "employee";
        return { email, name, role };
      });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setResults(null);
    if (!orgId) { setError("Pick an org first."); return; }
    const invites = parseInvites();
    if (invites.length === 0) { setError("Add at least one email."); return; }

    setSubmitting(true);
    const res = await fetch("/api/admin/users/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invites: invites.map((i) => ({ ...i, org_id: orgId })) })
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(json.error ?? "Failed"); return; }
    setResults(json.results);
  }

  const usersByOrg = users.reduce<Record<string, AppUser[]>>((acc, u) => {
    const k = u.org_id ?? "none";
    (acc[k] ??= []).push(u);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground">Bulk-invite teammates into an org.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bulk invite</CardTitle>
          <CardDescription>
            One per line. Format: <code>email, name, role</code>.
            Role defaults to {defaultRole}; use <code>leader</code> to override per-row.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
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
                <Label>Default role</Label>
                <Select value={defaultRole} onValueChange={(v) => setDefaultRole(v as "leader" | "employee")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">employee</SelectItem>
                    <SelectItem value="leader">leader</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk">Invitees</Label>
              <Textarea id="bulk" rows={6}
                placeholder={"alice@acme.com, Alice, leader\nbob@acme.com, Bob"}
                value={bulkText} onChange={(e) => setBulkText(e.target.value)} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Inviting…" : "Send invites"}
            </Button>
          </form>

          {results && (
            <div className="mt-6 space-y-2">
              <h3 className="font-medium text-sm">Result</h3>
              <ul className="text-sm divide-y border rounded-md">
                {results.map((r) => (
                  <li key={r.email} className="p-3 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono">{r.email}</span>
                      {r.ok
                        ? <Badge variant="strong">invited</Badge>
                        : <Badge variant="attention">{r.error}</Badge>}
                    </div>
                    {r.invite_link && (
                      <a href={r.invite_link} className="text-xs text-primary truncate hover:underline" target="_blank">
                        Local invite link (no SMTP) → click to copy URL
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">All users</h2>
        {Object.entries(usersByOrg).map(([k, list]) => {
          const org = orgs.find((o) => o.id === k);
          return (
            <Card key={k}>
              <CardHeader>
                <CardTitle className="text-base">{org?.name ?? "No org (super_admin)"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {list.map((u) => (
                  <div key={u.id} className="text-sm flex items-center justify-between">
                    <div>
                      <div>{u.name} <span className="text-muted-foreground">· {u.email}</span></div>
                    </div>
                    <Badge variant="outline">{u.role.replace("_", " ")}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
