"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import type { DevPlanGoal, GoalStatus } from "@/lib/types";

const STATUS_LABEL: Record<GoalStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete"
};
const STATUS_VARIANT: Record<GoalStatus, "stable" | "default" | "strong"> = {
  not_started: "stable",
  in_progress: "default",
  complete: "strong"
};

export default function PlanClient() {
  const [goals, setGoals] = useState<DevPlanGoal[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { reload(); }, []);

  async function reload() {
    const res = await fetch("/api/growth/goals");
    const json = await res.json();
    setGoals(json.goals);
  }

  async function create() {
    if (!title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/growth/goals", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || null,
        target_date: target || null
      })
    });
    setSaving(false);
    if (res.ok) {
      setCreating(false); setTitle(""); setDescription(""); setTarget("");
      reload();
    }
  }

  async function setStatus(g: DevPlanGoal, status: GoalStatus) {
    await fetch(`/api/growth/goals/${g.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    reload();
  }

  async function remove(g: DevPlanGoal) {
    if (!confirm("Delete this goal?")) return;
    await fetch(`/api/growth/goals/${g.id}`, { method: "DELETE" });
    reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Development plan</h1>
          <p className="text-muted-foreground text-sm">Goals you set for yourself. Private.</p>
        </div>
        {!creating && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New goal
          </Button>
        )}
      </div>

      {creating && (
        <Card>
          <CardHeader><CardTitle className="text-base">New goal</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target">Target date</Label>
              <Input id="target" type="date" value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button onClick={create} disabled={saving || !title.trim()}>Save</Button>
              <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {goals === null && <div className="text-sm text-muted-foreground">Loading…</div>}
      {goals && goals.length === 0 && !creating && (
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">No goals yet. Add one to get started.</CardContent></Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {goals?.map((g) => (
          <Card key={g.id}>
            <CardHeader className="flex flex-row items-start justify-between pb-3 space-y-0">
              <div>
                <CardTitle className="text-base">{g.title}</CardTitle>
                {g.target_date && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Target: {new Date(g.target_date).toLocaleDateString()}
                  </div>
                )}
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(g)}><Trash2 className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={STATUS_VARIANT[g.status]}>{STATUS_LABEL[g.status]}</Badge>
                <Select value={g.status} onValueChange={(v) => setStatus(g, v as GoalStatus)}>
                  <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not started</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
