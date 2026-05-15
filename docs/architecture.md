# Purple Signals — Architecture Decision Records

**Date:** 2026-05-08
**Deciders:** Morgan Swan (Developer), Founder (Stakeholder)

---

## ADR-001: Application Stack — Supabase + Next.js + Vercel

**Status:** Accepted

### Context

Purple Signals is an MVP for 3 pilot teams (~90 total users). It needs auth, a database with strong tenant isolation, a web UI with two dashboard views, transactional email, and an LLM integration. The build is solo-developer, timeline-sensitive, and must be production-stable for real pilot users.

### Decision

Use **Supabase** (Postgres + Auth + Row-Level Security + Realtime) as the backend, **Next.js** (App Router) as the full-stack framework, and **Vercel** for deployment.

### Options Considered

#### Option A: Supabase + Next.js + Vercel

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low — single repo, single deploy target, managed DB |
| Cost | Free tier covers pilot scale. ~$25/mo if exceeded. |
| Scalability | Supabase scales to millions of rows. More than enough. |
| Team familiarity | Standard React/TypeScript stack. |
| Auth | Built-in (email/password, magic link, SSO later) |
| Tenant isolation | Row-Level Security at DB level — policy-based, not code-based |
| Time to market | Fastest of all options |

**Pros:** Single codebase, auth + DB + storage in one platform, RLS handles the hardest requirement (tenant isolation) declaratively, generous free tier, instant API via PostgREST if needed.
**Cons:** Vendor lock-in to Supabase (mitigated: it's open-source Postgres underneath, portable). RLS policies require careful testing.

#### Option B: Custom Backend (Express/Fastify + Postgres + separate auth)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium — separate API server, separate auth system, separate DB hosting |
| Cost | Higher — need to provision and manage more infrastructure |
| Scalability | Equivalent |
| Team familiarity | Standard |
| Auth | Must integrate Passport.js, Auth0, or similar |
| Tenant isolation | Must implement in application code — every query must include org_id filter |
| Time to market | 30-50% slower |

**Pros:** Full control, no vendor dependency.
**Cons:** More code to write, more things to misconfigure. Tenant isolation becomes an application-level concern — a single missed `WHERE org_id = ?` is a data leak. Auth is a significant build on its own.

#### Option C: Firebase + Next.js

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low-medium |
| Cost | Free tier, then pay-as-you-go |
| Scalability | Good |
| Team familiarity | Standard |
| Auth | Built-in |
| Tenant isolation | Firestore security rules — less expressive than SQL-level RLS |
| Time to market | Fast, but aggregation queries are harder in a document DB |

**Pros:** Fast auth setup, good realtime support.
**Cons:** Firestore is a document database. The core product is aggregate SQL queries (AVG scores grouped by category, with COUNT thresholds). This is trivial in Postgres and painful in Firestore. Wrong data model for the problem.

### Trade-off Analysis

The critical factor is tenant isolation. In Option B, every developer on every query must remember to filter by org_id. In Option A, Postgres enforces it at the row level — you literally cannot read another org's data even if the application code has a bug. For a product where data isolation is described as "critical" in the PRD, this is the deciding factor.

The second factor is speed. Solo dev, competitive quote. Supabase gives us auth, DB, and RLS out of the box. That's ~4-5 days of work we don't have to do.

### Consequences

- **Easier:** Auth, tenant isolation, schema migrations, deployment, API routes.
- **Harder:** Complex backend logic must fit Next.js API routes or Supabase Edge Functions. Acceptable for MVP scope.
- **Revisit when:** Scale exceeds Supabase free/pro tier, or we need background job processing beyond simple cron-triggered functions.

### Action Items

1. [x] Create Supabase project
2. [ ] Configure auth (email/password provider)
3. [ ] Write RLS policies for all tables
4. [ ] Deploy Next.js to Vercel, connect to Supabase

---

## ADR-002: Tenant Isolation — Row-Level Security, not Schema-per-Org

**Status:** Accepted

### Context

The PRD requires that company/team data is completely isolated and "no cross-team data mixing is possible." There are two standard approaches: separate schemas/databases per tenant, or shared tables with row-level filtering.

### Decision

Use **shared tables with an `org_id` column** on every data table, enforced by **Supabase Row-Level Security policies**.

### Options Considered

#### Option A: Shared tables + RLS (chosen)

**Pros:** Single schema, simple migrations, works at any scale, Supabase-native, policies are declarative SQL.
**Cons:** Must write and test RLS policies for every table. A missing policy = data leak (but Supabase defaults to deny-all, so a missing policy means no access, not open access).

#### Option B: Schema-per-org

**Pros:** Physical isolation — impossible to cross-read by construction.
**Cons:** Schema migrations must run N times. Supabase doesn't natively support multi-schema RLS. Adds operational complexity for zero benefit at 3-org scale.

### Consequences

- Every table with user-facing data must include `org_id`.
- Every table must have an RLS policy.
- Supabase's default is deny-all when RLS is enabled — this is safe-by-default.
- The `responses` table requires special handling: users can INSERT their own, but nobody can SELECT individual rows. Dashboards read through aggregate functions only.

---

## ADR-003: Score Computation — On-Read Aggregation, not Batch Pipeline

**Status:** Accepted

### Context

The PRD describes a flow: "survey window closes → responses analyzed → dashboard updated." This implies a batch processing step. The question is whether to pre-compute and store aggregate scores, or compute them on every dashboard load.

### Decision

**Compute aggregates on read** using Postgres functions or views. No batch pipeline, no separate "analyzed" state on cycles.

### Rationale

At 90 users × 12 questions = 1,080 response rows per cycle. Aggregating this is sub-millisecond in Postgres. A materialized view or pre-computed table adds complexity (when to recompute? what if a response is edited?) with zero performance benefit at this scale.

Cycle status simplifies to: `draft → open → closed`. The dashboard query checks `WHERE cycle.status = 'closed' AND COUNT(responses) >= 8`.

### Consequences

- **Easier:** No cron job, no "analysis" step, no race conditions, no stale cache.
- **Harder:** If we ever reach thousands of orgs with millions of responses, we'd add a materialized view. That's an optimization, not an architecture change.
- **Revisit when:** Dashboard queries exceed 100ms. (At current scale: never.)

---

## ADR-004: Anonymization — Display Gate, not Data Transformation

**Status:** Accepted

### Context

The PRD requires anonymized dashboards. Responses must be stored with `user_id` (needed for: preventing double-submission, calculating response rate, sending reminders to non-respondents). But leadership must never see who submitted what.

### Decision

**Store responses with full attribution** (user_id, question_id, cycle_id, score, comment). **Enforce anonymity at the query layer** — dashboard endpoints return only aggregated data, never individual rows. The 8-response minimum is a COUNT check in the aggregate function.

### Implementation

- RLS on `responses`: Users can INSERT/UPDATE where `user_id = auth.uid()`. No SELECT policy for direct row access.
- Dashboard data is served through a Postgres function (e.g., `get_cycle_scores(cycle_id)`) that returns `{category_name, avg_score, response_count, trend_delta}` — never individual responses.
- Comments are returned as a flat list with category tag and date only — no user identifier attached.
- The function returns empty/null if `COUNT(DISTINCT user_id) < 8`.

### Consequences

- **Easier:** No data transformation pipeline, no separate anonymized table, no risk of de-sync between raw and anonymized data.
- **Harder:** Must be very disciplined about never exposing a direct SELECT on `responses` to any client-facing route. RLS handles this, but it must be tested.
- **Risk:** With small teams, even anonymous comments might be identifiable by writing style. This is a product problem, not a technical one. Could add comment shuffling or paraphrasing later.

---

## ADR-005: Email Notifications — Resend with 3 Trigger Points

**Status:** Accepted

### Decision

Use **Resend** (or Postmark) for transactional email. Three triggers only:

1. **Cycle opens** → Email all users in the org with a link to the survey.
2. **Day 4 reminder** → Email users who have not yet submitted a response for this cycle.
3. **Cycle closes** → Email leadership users that results are ready.

### Implementation

Triggers are fired by:
- Trigger 1: Admin clicks "Open Cycle" in admin panel → API route sends batch email.
- Trigger 2: Supabase cron (pg_cron) or Vercel cron job checks daily for open cycles at day 4 → queries non-respondents → sends reminder.
- Trigger 3: Admin clicks "Close Cycle" → API route sends notification to leaders.

### Consequences

- Resend free tier: 3,000 emails/month. At 90 users × 3 emails = 270 per cycle. Well within limits.
- No email queue or retry logic needed at this scale. Direct send from API route.
- Day 4 reminder requires knowing who has responded — this is a simple `NOT IN (SELECT DISTINCT user_id FROM responses WHERE cycle_id = ?)` query.

---

## ADR-006: AI Leadership Coach — LLM Chat with Scoped Context

**Status:** Accepted

### Decision

Build a chat interface backed by **Anthropic Claude API** (or OpenAI, developer's choice). Each conversation injects the user's personal context as system prompt: their latest cycle scores, their dev plan goals, and their coaching notes summary.

### Implementation

- `coach_conversations` and `coach_messages` tables store chat history per user.
- On each message, the system prompt includes:
  - The user's role and org name
  - Their latest cycle's category scores (if available and cycle is closed)
  - Their active dev plan goals
  - A brief summary of recent coaching notes
- Standard chat completion API call with streaming response.
- RLS: users can only access their own conversations.

### Consequences

- **Cost:** ~$0.01-0.05 per conversation turn at current API pricing. Negligible at pilot scale.
- **Privacy:** User data is sent to the LLM provider. Must disclose in privacy policy. No other user's data is included.
- **Guardrails:** Standard LLM safety. No custom fine-tuning. The system prompt instructs the coach to focus on leadership development and defer to HR professionals for personnel issues.
- **Revisit when:** Users want the coach to reference team-level insights (would require careful anonymization of what context is shared).
