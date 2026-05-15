# Purple Signals — Build Roadmap

**Date:** 2026-05-08
**Format:** Phased, gated build plan
**Developer:** Solo
**Estimated Total:** 22–26 working days

---

## Guiding Principles

**Local first.** The primary goal of the build is a locally runnable version that Morgan can demo to a founder without any deployed infrastructure, external accounts, or live email flows. Phases 0–2 produce this. External services (Resend email, Vercel cron, production Supabase) are wired in during Phase 3 and only after the local demo is validated.

**Gated progression.** Each task has a gate — a specific, testable condition that must pass before the next task starts. Do not proceed past a gate until the condition has been verified manually or with a test script.

**Test as you build.** RLS policies and aggregate functions must be tested with multi-user, multi-org fixtures before any dependent UI is built. Discovering a broken isolation policy after the dashboards are built is expensive. Discovering it after 1.3 is cheap.

---

## Phase 0: Local Foundation (Days 1–3)

**Goal:** A runnable Next.js app with local Supabase, seeded demo data, and working auth. No external services. Morgan can log in as any persona and see real pages within 3 days of starting.

Use `supabase start` (Supabase CLI + Docker) for local Postgres + Auth. No remote Supabase project needed yet.

| # | Task | Est. Days | Gate Before Proceeding |
|---|------|-----------|------------------------|
| 0.1 | **Local environment setup** — Install Supabase CLI, `supabase init`, `supabase start`. Configure Next.js `.env.local` with local Supabase URL + anon key. Confirm Supabase Studio is accessible at localhost:54323. | 0.5 | `supabase status` shows all services healthy. Next.js dev server starts without errors. |
| 0.2 | **Database schema + migrations** — All core tables per system design §2 (orgs, users, categories, questions, cycles, cycle_questions, responses). Indexes and constraints. Run as a migration file via `supabase migration new`. | 0.5 | `supabase db reset` applies cleanly. All tables visible in Studio. |
| 0.3 | **RLS policies + helper functions** — All policies from system design §4 (updated version). Helper functions `public.get_user_org_id()` and `public.get_user_role()` with `SET search_path`. Aggregate functions from §5. | 1 | **Gate: run isolation test script.** Create 2 orgs, 2 users each. Verify: (a) user from Org A cannot select any rows from Org B's cycles or responses via direct Supabase client call; (b) `get_response_rate` called with Org B's cycle_id returns empty for Org A user; (c) unauthenticated call to all aggregate functions returns empty. **Do not proceed until all three pass.** |
| 0.4 | **Seed data** — Categories (6), placeholder questions (12, 2 per category), 1 demo org, 3 users (leader@demo.com / employee@demo.com / admin@demo.com), 1 closed cycle with ≥ 8 responses already submitted (fabricated seed data so dashboards show real content from day 1 of demo). | 0.5 | Log in as leader@demo.com → dashboard shows scores. Log in as employee@demo.com → team view shows simplified data. Log in as admin@demo.com → /admin route accessible. |

**Phase 0 Gate (before Phase 1):**
- [ ] Supabase runs locally with no remote dependency
- [ ] All 3 demo personas can log in
- [ ] Leadership dashboard displays seeded scores (not empty state)
- [ ] Cross-org isolation verified by test script

---

## Phase 1: Core Loop — Local (Days 4–12)

**Goal:** Complete survey submission → aggregation → dashboard loop, running fully locally. No email, no Vercel, no remote services.

| # | Task | Est. Days | Gate Before Proceeding |
|---|------|-----------|------------------------|
| 1.1 | **Auth flow** — Login page, session handling, role-based redirect (leader → /dashboard, employee → /team, super_admin → /admin). Accept-invite page using Supabase invite token flow (can use magic link locally). Protected layout wrapping all /(app) routes. | 1 | Log in as each persona, land on correct page. Navigating to /dashboard as employee → redirect. Navigating to /admin as employee → redirect. Unauthenticated → redirect to /login. |
| 1.2 | **Admin panel** — /admin routes: create org, bulk-invite users (email + role), create survey cycle (title, start date, end date). Cycle status management: draft → open → closed. | 2 | Admin can create a new org, invite 2 users, create a cycle, and open it — all without a developer. Invited users appear in the users table. |
| 1.3 | **Survey page** — Active cycle detection, question display grouped by category, 1–10 slider + optional comment per question, atomic submit (all questions in one transaction), already-submitted state (shows confirmation, hides form). | 1.5 | Submit full survey as employee. Re-loading /survey shows confirmation state, not the form again. Submitting twice → 409 error. Submitting for a closed cycle → 403 error. Check DB: unique constraint on (cycle_id, question_id, user_id) holds. |
| 1.4 | **Leadership dashboard** — Overall health score, 6 category cards (score + trend delta + status badge: Strong / Stable / Needs Attention), response rate widget, signals list (anonymous comments, random order). Insufficient-responses empty state (< 8 respondents). Reads via `get_cycle_scores`, `get_cycle_trends`, `get_cycle_signals`, `get_response_rate` functions. | 2.5 | With ≥ 8 seeded responses: all 6 category cards show scores. With 7 seeded responses: dashboard shows empty state with response count but no scores. Signals show no dates, no author identifiers. Employee viewing /dashboard → redirect. |
| 1.5 | **Employee dashboard** — Overall score, one strongest area, one weakest area. Article recommendations placeholder (real articles wired in Phase 2). Reads from the same aggregate functions, filtered/simplified. | 0.5 | Employee sees overall score + 2 areas. Leader viewing /team → redirect (or allowed, confirm with Morgan). |

**Phase 1 Gate (before Phase 2):**
- [ ] Admin can complete the full onboarding flow solo (org → users → cycle → open)
- [ ] Users can submit surveys and see confirmation
- [ ] Leadership dashboard shows correct aggregated data with threshold gate enforced
- [ ] Employee dashboard shows simplified view
- [ ] All data from Org A is invisible to Org B (re-run isolation script with new data)
- [ ] **No external services required** — app runs entirely with `supabase start` + `npm run dev`

---

## Phase 2: Individual Growth — Local (Days 13–17)

**Goal:** Full individual growth section running locally. No external services.

| # | Task | Est. Days | Gate Before Proceeding |
|---|------|-----------|------------------------|
| 2.1 | **Growth schema + RLS** — coaching_notes, dev_plan_goals, articles, coach_conversations, coach_messages tables. All policies per system design §4 (note: coach_messages INSERT restricted to role = 'user' only). | 0.5 | Verify in Studio: user cannot insert a coach_messages row with role = 'system'. User cannot read another user's coaching_notes. |
| 2.2 | **Coaching Notes** — Rich text editor (Tiptap), CRUD, chronological list, private to user. | 1 | Create, edit, delete a note. Log in as different user → cannot see first user's notes. |
| 2.3 | **Personal Development Plan** — Goal cards, status toggle (not started / in progress / complete), optional target date, CRUD. | 1 | Create goal, cycle through all statuses, delete. Confirm private to own user. |
| 2.4 | **Articles** — Admin can add articles (title, description, URL, category tag, read time). Users see curated list. Employee dashboard links to articles matching weakest category. | 0.5 | Admin adds article tagged to a category. Employee with that category as weakest sees the article on their dashboard. |
| 2.5 | **AI Leadership Coach** — Chat UI with streaming, Anthropic API integration, system prompt with user's context (scores, goals, notes summary), conversation persistence. Server-side writes assistant/system messages using service role key; client inserts only user-role messages. | 2 | Send a message, receive streaming response. Conversation persists across page reload. Coach response references user's scores or goals. Verify no system-role messages can be inserted via direct Supabase client call. |

**Phase 2 Gate (local demo complete):**
- [ ] All growth features work locally
- [ ] AI coach responds with user context
- [ ] All growth data confirmed private per user (RLS)
- [ ] Morgan can run the full demo flow from login → survey → dashboard → growth without any external service
- [ ] **This is the founder demo checkpoint.** Get founder sign-off before Phase 3.

---

## Phase 3: External Services + Hosting (Days 18–22)

**Goal:** Wire in production infrastructure. The app is already working — this phase connects it to the outside world.

| # | Task | Est. Days | Gate Before Proceeding |
|---|------|-----------|------------------------|
| 3.1 | **Remote Supabase project** — Create hosted project, run all migrations, verify RLS policies apply identically to local. Port environment variables to Vercel. | 0.5 | Remote DB has same schema as local. RLS isolation test script passes on remote. |
| 3.2 | **Vercel deployment** — Connect GitHub repo, configure environment variables (Supabase URL/keys, Anthropic API key). Deploy. | 0.5 | Production URL loads login page. Demo personas can log in. |
| 3.3 | **Email notifications (Resend)** — Integrate Resend. Three templates: cycle opened (all org users), day-4 reminder (non-respondents only), cycle closed (leaders only). Triggered by admin actions (open/close) and Vercel Cron for the day-4 reminder. Cron query: `status = 'open' AND starts_at + INTERVAL '4 days' <= now() AND starts_at + INTERVAL '5 days' > now()`. | 1.5 | Open a cycle → all org users receive email. Close a cycle → leaders receive email. Simulate day-4 cron → only non-respondents receive reminder. |
| 3.4 | **Invite flow (production)** — Confirm Supabase invite emails are enabled in the hosted project dashboard. Wire accept-invite page to Supabase invite token. Test full flow: admin invites email → user receives email → clicks link → sets password → lands on correct dashboard. | 0.5 | End-to-end invite flow works with a real email address. |

**Phase 3 Gate (before Phase 4):**
- [ ] Hosted app accessible at Vercel URL
- [ ] All 3 email triggers fire correctly to real inboxes
- [ ] Full invite-to-dashboard flow works on production
- [ ] RLS isolation verified on production DB (not just local)

---

## Phase 4: Polish + Pilot Prep (Days 23–26)

| # | Task | Est. Days | Gate Before Proceeding |
|---|------|-----------|------------------------|
| 4.1 | **UI polish + trend charts** — Purple brand, card layouts, typography, responsive design, loading/empty/error states. TrendChart component (Recharts sparklines showing category scores across multiple closed cycles — requires ≥ 2 closed cycles with sufficient responses). | 2 | UI matches brand direction. Trend chart renders correctly with 2 cycles of data. App is usable on mobile. |
| 4.2 | **End-to-end testing** — Full flow test (admin → invite → survey → close → dashboard), cross-org isolation test, edge cases (< 8 responses, 0 comments, first cycle with no trends, all questions answered without comments). | 1 | All edge cases handled gracefully. No blank screens or unhandled errors. Cross-org test passes on production. |
| 4.3 | **Pilot data prep** — Real question bank from founder (OQ-2, OQ-4, OQ-5 must be resolved), first pilot org created, test cycle run. | 0.5 | Blocking open questions resolved. Real questions seeded. Founder can initiate a cycle and demo solo. |
| 4.4 | **Buffer / bug fixes** | 1 | — |

**Phase 4 Gate (pilot ready):**
- [ ] UI matches brand mockups
- [ ] Real question bank loaded
- [ ] Founder can run the full demo without developer
- [ ] First pilot org created and ready to launch

---

## Summary Timeline

```
Days 1–3    Phase 0  Local foundation, RLS isolation verified
Days 4–12   Phase 1  Core survey → dashboard loop, fully local
Days 13–17  Phase 2  Individual growth features
            ↑ FOUNDER DEMO CHECKPOINT (local, no external services)
Days 18–22  Phase 3  Resend email, Vercel deploy, production Supabase
Days 23–26  Phase 4  UI polish, testing, pilot prep
```

| Phase | Days | Cumulative | External Services? |
|-------|------|-----------|-------------------|
| Phase 0: Foundation | 3 | 3 | None (local Supabase only) |
| Phase 1: Core Loop | 9 | 12 | None |
| Phase 2: Growth | 5 | 17 | Anthropic API (AI coach only) |
| Phase 3: Hosting + Email | 4–5 | 21–22 | Resend, Vercel, remote Supabase |
| Phase 4: Polish + Pilot | 4 | 25–26 | Full stack |

---

## Dependencies & Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Question bank not authored** | Blocks pilot launch, not build | Placeholder questions for dev/testing. Real questions before Phase 4.3. |
| **RLS misconfiguration** | Cross-org data leak | Dedicated isolation test script run at gates 0, 1, and 3. |
| **Supabase local Docker issues** | Delays Phase 0 | Fallback: use hosted Supabase free tier from day 1 if Docker is unreliable on dev machine. |
| **AI coach quality** | Poor coaching experience | Strong system prompt, iterate based on founder feedback. Can gate behind "beta" label. |
| **Email deliverability** | Invites land in spam | Custom domain on Resend. DKIM/SPF verified before pilot. Not blocking for local demo. |
| **Open questions OQ-2, OQ-4, OQ-5** | Block Phase 4.3 only | Must be resolved before first real cycle, not before build starts. |

---

## Tech Stack Summary

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js 14+ (App Router) | Full-stack, single codebase |
| UI | Tailwind CSS + shadcn/ui | Fast, matches clean mockup aesthetic |
| Backend | Next.js API Routes | No separate server needed |
| Database | Supabase (Postgres + local CLI) | RLS, auth, local dev parity with prod |
| Auth | Supabase Auth | Email/password, invite links, session management |
| Email | Resend (Phase 3+) | Simple API, good deliverability, free tier |
| AI | Anthropic Claude API | Leadership coaching chat |
| Hosting | Vercel (Phase 3+) | Zero-config deploys, edge functions, cron |
| Charts | Recharts | Trend visualizations |
| Rich Text | Tiptap | Coaching notes editor |
| Monitoring | Sentry free tier | Error tracking |

**Service role key usage rule:** The service role key (bypasses RLS) is permitted only in: (a) admin API routes for org/user/cycle writes, (b) server-side coach message writes (assistant/system role). All other API routes must use the user's JWT via the anon key so RLS enforces tenant isolation automatically.
