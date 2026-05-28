# Decisions

Significant decisions with context and rationale. Append only — do not edit past entries.
Format: `## YYYY-MM-DD — [Decision title]`

---

## 2026-05-08 — Tech stack locked

**Decision:** Next.js 14+ (App Router) + Supabase + Resend + Anthropic Claude API + Vercel

**Why:** Supabase provides managed Postgres with native RLS support — critical for multi-tenant isolation without a custom auth/DB layer. Next.js unifies frontend and API routes in a single codebase. Vercel handles deploys and cron jobs without additional infrastructure. Anthropic API for AI coach is a natural fit given the founder's relationship with Claude.

**Alternatives considered:** Separate Express/Node backend (rejected — unnecessary complexity for solo developer), PlanetScale (rejected — no native RLS), AWS SES for email (rejected — Resend is simpler with better DX).

---

## 2026-05-08 — 8-response anonymity threshold enforced at query layer

**Decision:** The 8-respondent minimum is enforced in the database query/function (`COUNT(DISTINCT user_id) >= 8`), not the UI layer.

**Why:** UI-only enforcement can be bypassed by direct API calls. Query-level enforcement means no dashboard data is ever returned — even from the API — until the threshold is met. This is load-bearing for user trust in the anonymity guarantee.

---

## 2026-05-08 — MVP uses fixed question bank (no custom questions per org)

**Decision:** All orgs share the same fixed question bank for the MVP. No per-org custom questions.

**Why:** Validates the default framework first. Consistent questions across orgs enable cleaner benchmarking in later phases. Custom question authoring is a significant schema and UI addition with unclear MVP value. Moved to P2.

---

## 2026-05-08 — Local-first build sequence

**Decision:** Build phases 0–2 targeting a locally runnable demo (Supabase CLI + Docker, no remote services) before wiring in Vercel, Resend, or a production Supabase project (Phase 3).

**Why:** The immediate goal is a founder demo. A local-first build removes dependency on account setup, email deliverability, and deployment configuration during the core build sprint. It also means the demo can run offline and is reproducible. External services are added only after the core product is validated locally.

---

## 2026-05-08 — Security fixes to RLS and aggregate functions

**Decision:** The following changes were made to the system design before build starts:

1. Helper functions moved from `auth` schema to `public` schema (`public.get_user_org_id()`, `public.get_user_role()`) with explicit `SET search_path` to prevent schema injection.
2. `get_cycle_trends` signature changed — `p_org_id` parameter removed. Org is now derived from auth context internally to eliminate a NULL-bypass vulnerability.
3. `get_response_rate` now includes an org guard (was missing entirely — allowed any user to probe response counts for other orgs' cycles).
4. `get_cycle_signals` now returns comments in `ORDER BY random()` and omits the `submitted_date` field — chronological ordering in small teams (8–10 respondents) makes the last submitter identifiable.
5. `responses` INSERT RLS policy now enforces cycle is open and belongs to user's org at the DB level, not just the API layer.
6. `coach_messages` INSERT policy now restricts client-insertable role to `'user'` only. Server writes assistant/system messages via service role key.
7. Explicit super_admin write policies added for orgs, users, cycles, cycle_questions.
8. RLS enabled on `articles` and `categories` with explicit public SELECT policy (was ambiguous).

**Why:** Several of these were load-bearing for the tenant isolation guarantee. The `get_response_rate` missing guard and `get_cycle_trends` NULL bypass were the most critical — both could expose cross-org data to authenticated users.

---

## 2026-05-08 — AI coach uses claude-sonnet-4-6 with per-user system prompt

**Decision:** The AI coach calls Anthropic's `claude-sonnet-4-6` model. The system prompt is rebuilt server-side on each chat call and includes (a) the user's role and org name, (b) the latest closed cycle's category scores and trend status (or a placeholder if the threshold isn't met), (c) the user's active dev plan goals, and (d) snippets from the user's 5 most recent coaching notes.

**Why:** Sonnet 4.6 is the right speed/quality tradeoff for short conversational coaching turns. Rebuilding the prompt each call (rather than persisting a fixed system message) means coach context stays fresh as the user updates their goals or new cycles close, without any background sync. The note snippets are HTML-stripped to ~120 chars so they fit cheaply in context.

---

## 2026-05-08 — Coach assistant messages written via service role only

**Decision:** Client code can only insert `coach_messages` rows with `role = 'user'`. Assistant and system messages are written from the server using the service role key.

**Why:** RLS policy on `coach_messages` enforces this with `WITH CHECK (role = 'user' …)`. The pattern prevents a malicious client from forging assistant turns or seeding system instructions to itself, while still letting the dashboard read its own conversation history. The chat API persists the user message via the user's RLS-scoped client (so the policy fires) and the streamed assistant reply via the service role client.

---

## 2026-05-08 — Real-time dashboards excluded from MVP

**Decision:** Dashboards show data from closed cycles only. No live score tracking while a survey is open.

**Why:** Showing partial data during collection risks anchoring bias — leaders would see early signals and potentially behave differently, contaminating the remaining responses. Closed-cycle-only is the correct default for data integrity.
