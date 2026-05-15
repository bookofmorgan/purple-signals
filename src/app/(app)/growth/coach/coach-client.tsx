"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Send, Plus, MessageSquare } from "lucide-react";

interface Message { id?: string; role: "user" | "assistant"; content: string }
interface Conversation { id: string; title: string | null; created_at: string }

export default function CoachClient() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { reloadConversations(); }, []);
  useEffect(() => { if (activeId) loadMessages(activeId); else setMessages([]); }, [activeId]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function reloadConversations() {
    const res = await fetch("/api/coach/conversations");
    const json = await res.json();
    setConversations(json.conversations ?? []);
  }

  async function loadMessages(id: string) {
    const res = await fetch(`/api/coach/conversations/${id}/messages`);
    const json = await res.json();
    setMessages(json.messages ?? []);
  }

  function newConversation() {
    setActiveId(null);
    setMessages([]);
    setInput("");
    setError(null);
  }

  async function send() {
    if (!input.trim() || streaming) return;
    setError(null);
    const userMessage = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMessage }, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: activeId ?? undefined, message: userMessage })
      });

      if (!res.ok || !res.body) {
        const txt = await res.text();
        try { const j = JSON.parse(txt); setError(j.error ?? "Failed"); } catch { setError(txt || "Failed"); }
        setStreaming(false);
        // Remove the optimistic empty assistant placeholder.
        setMessages((m) => m.slice(0, -1));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE blocks separated by blank lines.
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";
        for (const block of blocks) {
          const lines = block.split("\n");
          let eventType = "message";
          let dataLine = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) eventType = line.slice(7).trim();
            else if (line.startsWith("data: ")) dataLine = line.slice(6);
          }
          if (!dataLine) continue;
          let payload: { text?: string; conversation_id?: string; error?: string };
          try { payload = JSON.parse(dataLine); } catch { continue; }

          if (eventType === "conversation" && payload.conversation_id) {
            setActiveId(payload.conversation_id);
          } else if (eventType === "delta" && payload.text) {
            setMessages((m) => {
              const next = [...m];
              const last = next[next.length - 1];
              if (last && last.role === "assistant") {
                next[next.length - 1] = { ...last, content: last.content + payload.text };
              }
              return next;
            });
          } else if (eventType === "error") {
            setError(payload.error ?? "stream error");
          }
        }
      }
    } finally {
      setStreaming(false);
      reloadConversations();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="grid md:grid-cols-[260px_1fr] gap-4 h-[calc(100vh-8rem)]">
      <aside className="space-y-2">
        <Button onClick={newConversation} variant="outline" className="w-full justify-start">
          <Plus className="h-4 w-4" /> New conversation
        </Button>
        <div className="space-y-1">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`w-full text-left text-sm rounded-md px-3 py-2 flex items-start gap-2 transition-colors ${
                activeId === c.id ? "bg-primary/10 text-primary" : "hover:bg-accent"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{c.title || "Untitled"}</span>
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="text-xs text-muted-foreground px-3">No conversations yet.</p>
          )}
        </div>
      </aside>

      <div className="flex flex-col min-h-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto pr-2 space-y-4">
          {messages.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3 text-primary">
                  <Sparkles className="h-5 w-5" />
                  <h2 className="font-semibold">AI leadership coach</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Ask anything about your leadership development. The coach has context about your latest team scores
                  and your current dev plan goals.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "What should I focus on this month based on my scores?",
                    "Help me plan a 1:1 about feedback frequency.",
                    "How do I open a conversation about ownership?"
                  ].map((s) => (
                    <Button key={s} size="sm" variant="outline" onClick={() => setInput(s)}>{s}</Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border"
              }`}>
                {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
              </div>
            </div>
          ))}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="pt-3 border-t">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
              placeholder="Ask the coach…"
              disabled={streaming}
            />
            <Button onClick={send} disabled={streaming || !input.trim()} size="icon" className="h-auto">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Coach responses are not professional advice. For HR or legal matters, talk to your team or a professional.
          </p>
        </div>
      </div>
    </div>
  );
}
