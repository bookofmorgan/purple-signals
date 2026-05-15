import type { SupabaseClient } from "@supabase/supabase-js";
import type { CategoryTrend, DevPlanGoal, AppUser } from "@/lib/types";

/**
 * Build the system prompt for the AI leadership coach. Uses RLS-scoped queries
 * so each user only ever sees their own data + their org's most recent closed cycle.
 */
export async function buildCoachSystemPrompt(
  supabase: SupabaseClient,
  profile: AppUser,
  orgName: string | null
): Promise<string> {
  // 1. Most recent closed cycle for the user's org → category scores.
  let scoresBlock = "  (No closed cycle data yet for this team.)";
  if (profile.org_id) {
    const { data: cycle } = await supabase
      .from("cycles")
      .select("id, title, ends_at")
      .eq("status", "closed")
      .eq("org_id", profile.org_id)
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cycle) {
      const { data: trends } = await supabase.rpc("get_cycle_trends", { p_cycle_id: cycle.id });
      const t = (trends as CategoryTrend[] | null) ?? [];
      if (t.length > 0) {
        scoresBlock = `  From cycle "${cycle.title}" (closed ${new Date(cycle.ends_at).toLocaleDateString()}):\n` +
          t.map((c) => `    - ${c.category_name}: ${Number(c.current_score).toFixed(1)} / 10 (${c.status}${
            c.delta ? `, Δ ${Number(c.delta) > 0 ? "+" : ""}${Number(c.delta).toFixed(1)} vs prior` : ""
          })`).join("\n");
      } else {
        scoresBlock = "  (Latest cycle has fewer than 8 respondents — scores hidden by anonymity threshold.)";
      }
    }
  }

  // 2. Active dev plan goals.
  const { data: goals } = await supabase
    .from("dev_plan_goals")
    .select("title, description, status, target_date")
    .eq("user_id", profile.id)
    .neq("status", "complete")
    .order("created_at", { ascending: false })
    .limit(8);
  const goalsBlock = ((goals as DevPlanGoal[] | null) ?? []).length > 0
    ? (goals as DevPlanGoal[]).map((g) =>
        `    - ${g.title} (${g.status}${g.target_date ? `, target ${new Date(g.target_date).toLocaleDateString()}` : ""})${g.description ? `: ${g.description}` : ""}`
      ).join("\n")
    : "    (None yet.)";

  // 3. Recent coaching note summary (titles via first 80 chars stripped of HTML).
  const { data: notes } = await supabase
    .from("coaching_notes")
    .select("content, created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  const notesBlock = (notes && notes.length > 0)
    ? notes.map((n: { content: string; created_at: string }) => {
        const plain = n.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
        return `    - ${new Date(n.created_at).toLocaleDateString()}: ${plain}${plain.length === 120 ? "…" : ""}`;
      }).join("\n")
    : "    (No notes yet.)";

  return `You are a leadership development coach for ${profile.name}${orgName ? ` at ${orgName}` : ""}.

Your role is to help this person grow as a leader through thoughtful questions, frameworks,
and practical advice. You are warm, direct, and evidence-based.

CONTEXT ABOUT THIS PERSON:
- Role: ${profile.role.replace("_", " ")}
- Latest team leadership scores (1-10 scale, anonymous team feedback):
${scoresBlock}
- Their active development goals:
${goalsBlock}
- Recent coaching notes they've written:
${notesBlock}

GUIDELINES:
- Focus on leadership development, team dynamics, and personal growth.
- Reference their actual scores and goals when it helps make advice concrete.
- Suggest specific, actionable next steps over abstract platitudes.
- If asked about HR matters (termination, legal issues, compensation), advise them to consult their HR team or a professional. Do not give HR advice.
- Keep responses concise and practical. Ask clarifying questions when the situation is ambiguous.
- Never reveal individual respondents' identities — the team scores are anonymised aggregates only.`;
}
