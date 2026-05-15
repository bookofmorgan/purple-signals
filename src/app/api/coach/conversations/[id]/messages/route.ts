import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-helpers";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireApiUser();
  if (!ctx.ok) return ctx.res;
  const { id } = await params;

  // RLS ensures the user only sees messages for their own conversations.
  const { data, error } = await ctx.supabase
    .from("coach_messages")
    .select("*")
    .eq("conversation_id", id)
    .neq("role", "system")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data });
}
