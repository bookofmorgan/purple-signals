import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { requireApiUser, badRequest } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildCoachSystemPrompt } from "@/lib/coach-context";

const Body = z.object({
  conversation_id: z.string().uuid().optional(),
  message: z.string().min(1).max(8000)
});

export async function POST(req: Request) {
  const ctx = await requireApiUser();
  if (!ctx.ok) return ctx.res;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured. Set it in .env.local." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const { supabase, profile, userId } = ctx;
  const admin = createAdminClient();

  // 1) Resolve or create the conversation. Only the user-scoped client may write user
  //    messages (RLS enforces role='user'); admin client used for assistant writes.
  let conversationId = parsed.data.conversation_id;
  if (!conversationId) {
    const { data: conv, error } = await supabase
      .from("coach_conversations")
      .insert({
        user_id: userId,
        title: parsed.data.message.slice(0, 60)
      })
      .select().single();
    if (error || !conv) {
      return new Response(JSON.stringify({ error: error?.message ?? "create failed" }), { status: 400 });
    }
    conversationId = conv.id;
  }

  // 2) Persist the user's message via RLS-scoped client.
  const { error: insertErr } = await supabase
    .from("coach_messages")
    .insert({ conversation_id: conversationId, role: "user", content: parsed.data.message });
  if (insertErr) {
    return new Response(JSON.stringify({ error: insertErr.message }), { status: 400 });
  }

  // 3) Build context: pull org name + history + system prompt.
  const orgRes = profile.org_id
    ? await supabase.from("orgs").select("name").eq("id", profile.org_id).single()
    : { data: null as { name: string } | null };
  const orgName = orgRes.data?.name ?? null;

  const { data: history } = await supabase
    .from("coach_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .neq("role", "system")
    .order("created_at", { ascending: true });

  const systemPrompt = await buildCoachSystemPrompt(supabase, profile, orgName);

  // Map to Anthropic messages, alternating user/assistant. Drop trailing duplicates.
  const messages = (history ?? [])
    .filter((m): m is { role: "user" | "assistant"; content: string } => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));

  // 4) Stream via Anthropic SDK; pipe text deltas to client and accumulate to persist.
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let assistant = "";

      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      // Send the conversation_id immediately so the client can resume on reload.
      send("conversation", { conversation_id: conversationId });

      try {
        const upstream = await anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          system: systemPrompt,
          messages
        });

        for await (const ev of upstream) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
            assistant += ev.delta.text;
            send("delta", { text: ev.delta.text });
          }
        }

        // Persist assistant turn via service role (RLS forbids non-user role for clients).
        if (assistant) {
          await admin.from("coach_messages").insert({
            conversation_id: conversationId,
            role: "assistant",
            content: assistant
          });
        }

        send("done", { ok: true });
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown error";
        send("error", { error: msg });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
