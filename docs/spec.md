# Purple Signals — Product Specification (MVP)

**Status:** Draft
**Date:** 2026-05-08
**Author:** Morgan Swan
**Audience:** Developer, Founder

---

## Problem Statement

Leadership teams in growing companies have no lightweight, recurring mechanism to measure how their leadership is perceived by the wider team. Existing tools are either annual (too slow), generic engagement surveys (too broad), or 360-feedback tools (too heavy). The result is that leadership blind spots persist for months, trust erodes silently, and interventions come too late.

Purple Signals solves this by running short, recurring pulse surveys focused specifically on leadership dimensions, then presenting anonymized, aggregated insights to leadership — and a simplified health view to the wider team.

**Who is affected:** Leadership teams (3-10 people) and their wider teams (~30 people) in scaling companies.

**Cost of not solving:** Leadership issues compound. A team that scores 4/10 on "Ownership" in month 1 will not self-correct without signal. By month 6, attrition follows.

---

## Goals

1. **Demonstrate the core feedback loop** — Users submit pulse responses, leadership sees aggregated scores and trends within one cycle. This is the entire product thesis.
2. **Maintain trust through anonymity** — No leadership user can ever trace a response to an individual. The 8-response minimum threshold is load-bearing for trust.
3. **Support 3 pilot teams independently** — Complete data isolation between orgs. No cross-tenant data leakage.
4. **Enable self-serve pilot onboarding** — The founder can create orgs, invite users, and launch cycles without developer intervention.
5. **Provide a personal growth surface** — Each user has private coaching notes, a development plan, and access to an AI leadership coach, creating individual value beyond the team-level dashboards.

---

## Non-Goals

1. **Custom question authoring per org** — MVP uses a fixed question bank. Orgs cannot create their own questions yet. (Premature — need to validate the default framework first.)
2. **Manager-to-report relationships** — No org chart, no direct-report mapping. Roles are flat: leader or employee. (Adds significant schema complexity for unclear MVP value.)
3. **Real-time dashboards during open cycles** — Dashboards show data from closed cycles only. No live score tracking while a survey is open. (Showing partial data during collection risks anchoring bias.)
4. **Integrations (Slack, Teams, HRIS)** — No third-party integrations. Email is the only external channel. (Scope control — can add post-pilot.)
5. **White-labeling or custom branding per org** — Single Purple Signals brand. (Premature for 3 pilots.)

---

## User Types

### Leadership Team Member
- Can view the full Leadership Health dashboard (scores, trends, signals, risk areas)
- Can view Individual Growth section (coaching notes, dev plan, AI coach, articles)
- Submits pulse surveys like any other team member
- Cannot see who submitted what or individual responses

### Employee (Wider Team Member)
- Submits pulse surveys
- Sees a simplified Team Health dashboard (overall score, one strong area, one weak area)
- Can view Individual Growth section (coaching notes, dev plan, AI coach, articles)
- Sees recommended reading linked to team's weakest category

### Super Admin
- Can create orgs, bulk-invite users, assign roles
- Can create and manage survey cycles
- Access to `/admin` routes only
- This is an operational role for the founder/operator, not exposed to pilot users

---

## User Stories

### Survey Submission
- As an **employee**, I want to complete a pulse survey in under 3 minutes so that it does not feel like a burden and I actually do it each cycle.
- As an **employee**, I want to add optional written comments to my ratings so that I can provide context the numbers alone cannot capture.
- As an **employee**, I want to see that my survey has been submitted and I cannot be asked to do it again this cycle, so that I feel confident my input was recorded.
- As a **leader**, I want to submit a pulse survey with the same questions as employees so that my perspective is included in the aggregate data.

### Leadership Dashboard
- As a **leader**, I want to see an overall Leadership Health score so that I have one number summarizing how the team perceives our leadership.
- As a **leader**, I want to see scores broken down by the 6 leadership categories so that I know specifically where we are strong and where we need to improve.
- As a **leader**, I want to see how each category score changed since the last cycle so that I can tell if things are getting better or worse.
- As a **leader**, I want to see anonymous written comments ("signals") from the team so that I understand the qualitative context behind the numbers.
- As a **leader**, I want to see the response rate for the current cycle so that I know how representative the data is.
- As a **leader**, I want the dashboard to show nothing until at least 8 responses are in, so that I can trust individual responses are not identifiable.

### Employee Dashboard
- As an **employee**, I want to see an overall team health score so that I know how the team is doing at a high level.
- As an **employee**, I want to see one area the team should focus on and one area that is strong, so that I understand the team's priorities without information overload.
- As an **employee**, I want recommended reading linked to the team's growth area so that I can contribute to improvement.

### Individual Growth
- As a **user** (any role), I want to keep private coaching notes so that I can reflect on my leadership development over time.
- As a **user**, I want to set development goals with statuses so that I can track my own growth.
- As a **user**, I want to chat with an AI leadership coach that understands my team's context so that I can get personalized development advice.
- As a **user**, I want to browse curated leadership articles so that I have resources to support my growth.

### Admin / Onboarding
- As the **founder**, I want to create a new org and bulk-invite users by email so that I can onboard a pilot team without a developer.
- As the **founder**, I want to create a survey cycle with a start and end date so that I can control when the pulse runs.
- As the **founder**, I want to close a cycle and see results populate the dashboard so that I can demo the product to investors.

### Notifications
- As an **employee**, I want to receive an email when a new survey cycle opens so that I know to log in and respond.
- As an **employee**, I want a reminder email if I have not responded by day 4 so that I do not forget.
- As a **leader**, I want an email when a cycle closes and results are ready so that I know to check the dashboard.

---

## Requirements

### P0 — Must Have (MVP cannot ship without these)

| # | Requirement | Acceptance Criteria |
|---|------------|-------------------|
| P0-1 | **Multi-tenant data isolation** | Every database query is scoped to `org_id`. Row-Level Security policies enforce this at the Postgres level. No application-level query can return data from another org. |
| P0-2 | **Email/password authentication** | Users can sign up (via invite link) and log in with email and password. Auth determines role (leader/employee/super_admin) and org membership. |
| P0-3 | **Survey submission** | Users see all questions for the active cycle, answer each on a 1-10 scale with optional comment, and submit. Unique constraint prevents double-submission per question per cycle. |
| P0-4 | **Anonymized Leadership Dashboard** | Leaders see: overall health score, 6 category scores, trend deltas vs previous cycle, status badges (Strong/Needs Attention/Stable), response rate, anonymous signals (comments). Dashboard returns empty state if fewer than 8 responses. |
| P0-5 | **Employee Dashboard** | Employees see: overall team health score, one strongest area, one weakest area, recommended articles filtered by weakest category. |
| P0-6 | **8-respondent anonymity threshold** | Dashboard aggregate queries return no data (scores or comments) until at least 8 distinct respondents (unique user_ids) have submitted for the cycle. This is enforced in the query/function via `COUNT(DISTINCT user_id) >= 8`, not the UI. |
| P0-7 | **Survey cycle management** | Admin can create a cycle (title, start date, end date), and cycles transition: draft → open → closed. Questions are bound to a cycle at creation via a join table. |
| P0-8 | **Admin panel** | Super admin can: create orgs, bulk-invite users (email + role), create/open/close cycles. Protected route, not visible to regular users. |
| P0-9 | **Email notifications** | Three triggers: cycle opens (all org users), day-4 reminder (non-respondents only), cycle closes (leaders only). Transactional email via Resend or Postmark. |
| P0-10 | **Question bank with fixed categories** | Seeded question bank: ~12 questions (2 per category across 6 categories). Questions are tagged by category. Same set used each cycle for trend consistency. |

### P1 — Should Have (improves experience significantly)

| # | Requirement | Notes |
|---|------------|-------|
| P1-1 | **Coaching Notes** | Rich text editor per user. Private, chronological list. CRUD operations scoped to own user_id. |
| P1-2 | **Personal Development Plan** | Goal cards with title, description, status (not started / in progress / complete), target date. CRUD scoped to own user_id. |
| P1-3 | **AI Leadership Coach** | Chat interface backed by LLM API (OpenAI or Anthropic). System context includes user's latest cycle scores and dev plan goals. Conversation history persisted. |
| P1-4 | **Articles / Resources** | Admin-curated list of leadership articles. Title, description, URL, optional category tag, read time. Read-only for users. Employee dashboard links to articles matching the team's weakest category. |
| P1-5 | **Trend visualization** | Line chart or sparkline showing category scores across multiple cycles. Requires at least 2 closed cycles with sufficient responses. |

### P2 — Future Considerations (not built now, but design should not prevent)

| # | Requirement | Architectural Implication |
|---|------------|--------------------------|
| P2-1 | Custom question authoring per org | Question bank already supports this — just add an `org_id` column and UI. |
| P2-2 | Manager-to-report relationships | Would require a `reports_to` column on users and filtered dashboard views. Schema should not assume flat roles forever. |
| P2-3 | Slack/Teams integration for survey delivery | Notification system should be pluggable — abstract the delivery channel. |
| P2-4 | Rotating question subsets per cycle | `cycle_questions` join table already supports variable question sets. |
| P2-5 | Export / PDF reports | Dashboard data is all query-based — adding a PDF render layer is additive. |
| P2-6 | SSO / SAML authentication | Supabase supports this natively. No schema changes needed. |

---

## Success Metrics

### Leading Indicators (measure within first 2 cycles)

| Metric | Target | How to Measure |
|--------|--------|---------------|
| Response rate per cycle | ≥ 70% | `COUNT(DISTINCT respondent) / COUNT(users in org)` |
| Survey completion time | < 3 minutes | Timestamp delta between first and last response per user per cycle |
| Dashboard engagement (leaders) | Leaders view dashboard within 48h of cycle close | Page view log or Supabase auth session |
| AI Coach usage | ≥ 30% of users try it within first month | `COUNT(DISTINCT user_id) on coach_conversations` |

### Lagging Indicators (measure after 3+ cycles)

| Metric | Target | How to Measure |
|--------|--------|---------------|
| Cycle-over-cycle score movement | At least 1 category shows ≥ 0.5 improvement after 3 cycles | Category score delta across cycles |
| Pilot retention | All 3 pilot orgs complete at least 3 cycles | Cycle count per org |
| Founder can demo without developer | Founder onboards a new pilot org solo | Observation |

---

## Open Questions

| # | Question | Owner | Blocking? |
|---|----------|-------|-----------|
| OQ-1 | Who writes coaching notes and dev plans — the user themselves, or a manager/coach for them? Current design: self-service, private. Needs founder confirmation. | Founder | No — current design works either way |
| OQ-2 | What is the exact question bank? The 12 questions (2 per category) need to be authored by someone who understands the leadership framework. | Founder | Yes — needed before first cycle |
| OQ-3 | Should the AI coach have guardrails beyond standard LLM safety? E.g., should it avoid giving advice on specific HR situations? | Founder | No — launch with standard safety, iterate |
| OQ-4 | What is the "tail components" category mentioned in the original PRD? Are these additional questions that map to the existing 6 categories, or a 7th+ category? | Founder | Yes — affects question bank structure |
| OQ-5 | The original PRD names the 6 categories as: Direction Setting, Culture, Performance Management, **Feedback**, Ownership, **Collaboration**. These docs use **Fresh Feedback** and **Alignment** instead (matching the UI mockups). Please confirm the canonical names before the question bank is written — they will be seeded into the database and used for all scoring and trend calculations. | Founder | Yes — needed before first cycle |
| OQ-5 | How should survey cycle cadence work long-term? Monthly? Bi-weekly? MVP: admin manually creates each cycle. Automation is P2. | Founder | No |
| OQ-6 | **Developer note:** The `/accept-invite` page (invite link → set password → account activated) is referenced in the component structure but has no API contract defined. This relies on Supabase's built-in invite flow (`supabase.auth.signUp` with invite token). Developer should confirm Supabase invite emails are enabled in the project dashboard and implement the accept-invite page accordingly. | Developer | No — standard Supabase flow, but must be explicitly wired up |

---

## Timeline Considerations

- **Hard constraint:** Must be pilot-ready — stable enough for real users submitting real data.
- **No hard date mentioned**, but the founder has other quotes in hand, implying urgency.
- **Phasing:** P0 items form the critical path (Phase 1). P1 items (Individual Growth) can ship as Phase 2 immediately after, with no dependency on Phase 1 schema changes.
- **Estimated total build:** 20-23 working days for a solo developer. See roadmap doc for phased breakdown.
