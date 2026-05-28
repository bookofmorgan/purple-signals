# STATUS

**Last updated:** 2026-05-28
**Current phase:** 🧊 **ON ICE** — paused 2026-05-28.
**Overall status:** Local MVP build (Phase 0–2) complete and runnable. Project paused pending founder re-engagement on the blocking open questions (OQ-2, OQ-4, OQ-5). Resume requires: founder delivers real question bank, confirms canonical category names, and books the demo. No further work until then.

---

## Pause note (2026-05-28)

Project parked. Local stack is intact and can be brought back up with `npm install && supabase start && supabase db reset && npm run dev`. The blocking gate is founder input on the question bank, not code. Resume by deciding either (a) push the founder for the real bank and run the demo, or (b) wind the project down formally.

---

## Pre-pause state (kept for reference)

---

## Current State

The full local MVP is in place per the roadmap. All Phase 0, 1, and 2 tasks are written:

- **Phase 0 (Local Foundation):** Next.js scaffold, Supabase config, schema migration, RLS + helper + aggregate functions migration, growth schema, seed data with 9 demo users + closed cycle that passes the 8-respondent threshold, and a cross-org isolation test script.
- **Phase 1 (Core Loop):** Auth (login + accept-invite + middleware), role-based redirects, admin panel (orgs, bulk invites, cycles, articles), survey page with already-submitted state, leadership dashboard with threshold gate, employee dashboard with article recommendations.
- **Phase 2 (Individual Growth):** Coaching notes (Tiptap editor), dev plan goals, articles surface for users, AI coach with streaming SSE and per-user context (latest cycle scores, dev plan goals, recent notes).

GitHub repo and PAT setup not yet done; this build was produced in-place under the project root.

---

## Next Actions

1. **Run the local stack** — `npm install && supabase start && supabase db reset && npm run dev`. See README §First run.
2. **Run the Phase 0.3 isolation gate** — `npm run db:test`. Must print `ALL ISOLATION TESTS PASSED` before moving on.
3. **Founder demo** — log in as each persona, complete a survey, see the dashboard, try the AI coach.
4. **Resolve blocking open questions** (OQ-2, OQ-4, OQ-5) so the real question bank can be seeded before Phase 4.3.
5. **Phase 3 (post-demo):** create remote Supabase project, deploy to Vercel, wire Resend for the three email triggers, enable Supabase invite emails on the hosted project.

---

## Blocking Open Questions

These must be resolved before Phase 3 / first real cycle (not blocking the local demo):

| ID | Question | Blocking |
|----|----------|---------|
| OQ-2 | Exact question bank (12 questions, 2 per category) | Yes — needed before first cycle |
| OQ-4 | "Tail components" — additional questions or a 7th+ category? | Yes — affects question bank structure |
| OQ-5 | Canonical category names: confirm "Fresh Feedback" / "Alignment" vs original "Feedback" / "Collaboration" | Yes — seeded into DB, used for all scoring |

---

## Phase 0 Progress (Local Foundation)

| Task | Status |
|------|--------|
| 0.1 Local Supabase CLI setup (config.toml, env.example, scripts) | ✅ Done — needs `supabase start` to verify on a Docker host |
| 0.2 Database schema + migrations | ✅ Done — `supabase/migrations/20260508000001_schema.sql` + `…000002_growth_schema.sql` |
| 0.3 RLS policies + helper + aggregate functions | ✅ Done — `…000003_rls.sql` + `…000004_aggregate_functions.sql` |
| 0.4 Seed data (categories, 12 placeholder questions, demo org with closed cycle and 9 responses) | ✅ Done — `supabase/seed.sql` |
| 0.gate Isolation test script | ✅ Done — `supabase/tests/isolation_test.sql` |

## Phase 1 Progress (Core Loop — Local)

| Task | Status |
|------|--------|
| 1.1 Auth flow + protected routes + role redirects | ✅ Done |
| 1.2 Admin panel (orgs / users / cycles / articles) | ✅ Done |
| 1.3 Survey page + atomic submit + already-submitted state | ✅ Done |
| 1.4 Leadership dashboard (scores, trends, signals, response rate, threshold gate) | ✅ Done |
| 1.5 Employee dashboard (overall, strongest/weakest, article recs) | ✅ Done |

## Phase 2 Progress (Individual Growth — Local)

| Task | Status |
|------|--------|
| 2.1 Growth schema + RLS (notes, goals, articles, coach_*) | ✅ Done — coach_messages INSERT restricted to role='user' |
| 2.2 Coaching notes (Tiptap CRUD) | ✅ Done |
| 2.3 Personal Development Plan (goal CRUD + status toggle) | ✅ Done |
| 2.4 Articles (admin CRUD; users see filtered list; employee dashboard shows weakest-category recs) | ✅ Done |
| 2.5 AI Leadership Coach (streaming SSE, system prompt with context, conversation persistence) | ✅ Done — service role used for assistant writes |

_Phase 3 (hosting + email) and Phase 4 (polish + pilot prep) begin after founder demo sign-off._

---

## Manual verification checklist (before founder demo)

Once the local stack is up, work through this list:

- [ ] `npm run db:test` prints `ALL ISOLATION TESTS PASSED`
- [ ] `admin@demo.com` lands on `/admin`; can create an org, invite users, create + open a cycle
- [ ] `leader@demo.com` lands on `/dashboard`; sees seeded April Pulse with 6 category cards and signals
- [ ] `employee@demo.com` lands on `/team`; sees overall + strongest/weakest + recommended articles
- [ ] On `/survey` for the open May Pulse, employee can submit responses; reload shows already-submitted state
- [ ] `/growth/notes`: create / edit / delete a note; logging in as another persona shows none of them
- [ ] `/growth/plan`: create a goal, cycle through statuses, delete
- [ ] `/growth/coach`: send a message, receive streaming response, conversation persists across reload
- [ ] Direct API hit to `/api/dashboard/scores?cycle_id=<other-org-cycle>` returns insufficient_responses (cross-org leak prevented)
fix3-test 2026-05-28T22:15
fix3-test-final 2026-05-28T22:29
