"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NoteEditor } from "@/components/growth/note-editor";
import { Trash2, Pencil, Save, X, Plus } from "lucide-react";
import type { CoachingNote } from "@/lib/types";

export default function NotesClient() {
  const [notes, setNotes] = useState<CoachingNote[] | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { reload(); }, []);

  async function reload() {
    const res = await fetch("/api/growth/notes");
    const json = await res.json();
    setNotes(json.notes);
  }

  async function create() {
    if (!draft.trim() || draft === "<p></p>") return;
    setSaving(true);
    const res = await fetch("/api/growth/notes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft })
    });
    setSaving(false);
    if (res.ok) { setDraft(""); setCreating(false); reload(); }
  }

  async function update(id: string) {
    setSaving(true);
    await fetch(`/api/growth/notes/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editingContent })
    });
    setSaving(false); setEditingId(null); reload();
  }

  async function remove(id: string) {
    if (!confirm("Delete this note?")) return;
    await fetch(`/api/growth/notes/${id}`, { method: "DELETE" });
    reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Coaching notes</h1>
          <p className="text-muted-foreground text-sm">Private to you. Reflect, capture, revisit.</p>
        </div>
        {!creating && (
          <Button onClick={() => { setCreating(true); setDraft(""); }}>
            <Plus className="h-4 w-4" /> New note
          </Button>
        )}
      </div>

      {creating && (
        <Card>
          <CardHeader><CardTitle className="text-base">New note</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <NoteEditor initialContent="" onChange={setDraft} />
            <div className="flex gap-2">
              <Button onClick={create} disabled={saving}><Save className="h-4 w-4" /> Save</Button>
              <Button variant="ghost" onClick={() => { setCreating(false); setDraft(""); }}><X className="h-4 w-4" /> Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {notes === null && <div className="text-sm text-muted-foreground">Loading…</div>}
      {notes && notes.length === 0 && !creating && (
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">No notes yet. Start with one observation from this week.</CardContent></Card>
      )}

      {notes?.map((n) => (
        <Card key={n.id}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs text-muted-foreground font-normal">
              {new Date(n.created_at).toLocaleString()}
              {n.updated_at !== n.created_at && <> · edited {new Date(n.updated_at).toLocaleDateString()}</>}
            </CardTitle>
            <div className="flex gap-1">
              {editingId === n.id ? (
                <>
                  <Button size="icon" variant="ghost" onClick={() => update(n.id)} disabled={saving}><Save className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                </>
              ) : (
                <>
                  <Button size="icon" variant="ghost" onClick={() => { setEditingId(n.id); setEditingContent(n.content); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(n.id)}><Trash2 className="h-4 w-4" /></Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editingId === n.id ? (
              <NoteEditor initialContent={n.content} onChange={setEditingContent} />
            ) : (
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: n.content }} />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
