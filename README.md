# Purple Signals

A recurring leadership pulse platform for scaling teams. Short, fixed-cadence surveys collect leadership signal from the whole team and surface anonymised, aggregated insights back to the leadership group.

Built around three product principles:

- **Anonymity is load-bearing.** No leadership user can ever trace a response to an individual. The 8-respondent minimum is enforced inside the database, not the UI.
- **Multi-tenant isolation is enforced at the database level.** Row-Level Security policies on every table — a missing application filter cannot leak another team's data.
- **Recurring cycles, not annual reviews.** Cycles run weekly or monthly. Trends across cycles are the unit of insight, not a single score.

**Live:** https://purple-signals.vercel.app

---

## Stack

- **Next.js 15** (App Router, TypeScript, React 19)
- **Supabase** — Postgres, Auth, Row-Level Security. Supabase CLI for local dev parity with prod.
- **Tailwind CSS** + a small set of Radix-based primitives
- **Recharts** for trend visualisations
- **Tiptap** for rich-text coaching notes
- **Anthropic Claude** (`claude-sonnet-4-6`) for the AI leadership coach, streamed via SSE
- **Vercel** for hosting; **Resend** planned for transactional email

---

## Local development

### Prerequisites

- Node 20 or later
- Docker Desktop (Supabase CLI uses it for local Postgres)
- Supabase CLI — `brew install supabase/tap/supabase`
- An Anthropic API key (only required for the AI coach surface)

### First run

```bash
npm install
supabase start                       # boots local Postgres + Auth + Studio + mail-catcher
cp .env.example .env.local           # then edit — see below
supabase db reset                    # apply migrations + seed
npm run db:test                      # cross-org isolation gate (3 cases)
npm run dev                          # http://localhost:3000
```

Open `.env.local` and paste in the values `supabase start` printed:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase start>
ANTHROPIC_API_KEY=<your key, optional>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Demo personas

All seeded with password `password`:

| Email | Role | Lands on |
|---|---|---|
| `admin@demo.com` | super_admin | `/admin` |
| `leader@demo.com` | leader | `/dashboard` |
| `employee@demo.com` | employee | `/team` |

Plus seven additional `emp3@`–`emp9@demo.com` accounts so the seeded April Pulse cycle passes the 8-respondent anonymity threshold and the leadership dashboard renders with real-looking data on first load.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:start` | `supabase start` |
| `npm run db:stop` | `supabase stop` |
| `npm run db:reset` | Wipe + reapply migrations + seed |
| `npm run db:test` | Run the cross-org isolation test |

---

## Architecture at a glance

```
┌─────────────────────────────────────────────────────────────┐
│                         Vercel                              │
│  Next.js App Router                                         │
│   ├─ /(auth)             Login + invite acceptance          │
│   ├─ /(app)              Authenticated user surfaces        │
│   │   ├─ /dashboard      Leadership dashboard               │
│   │   ├─ /team           Employee dashboard                 │
│   │   ├─ /survey         Active-cycle submission            │
│   │   ├─ /trends         Cross-cycle line charts            │
│   │   ├─ /signals        Filterable anonymous comments      │
│   │   ├─ /team-growth    Leader-only composite view         │
│   │   └─ /growth/*       Notes, dev plan, AI coach, articles│
│   ├─ /(admin)            Super-admin: orgs, users, cycles   │
│   └─ /api/*              Route handlers                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Supabase                              │
│   Postgres + RLS · GoTrue Auth · pg_cron                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                ┌──────────────────────────┐
                │ Anthropic Claude API      │
                │ Resend (transactional)    │
                └──────────────────────────┘
```

### Why this stack

- **Supabase + RLS** carries the tenant-isolation requirement at the database level. A bug in application code can't leak another team's data — `responses` rows physically cannot be read across orgs.
- **Aggregates via SECURITY DEFINER functions, not direct SELECT.** Dashboards call `get_cycle_scores`, `get_cycle_trends`, `get_cycle_signals`, `get_response_rate`, `get_employee_dashboard`. Each function checks `auth.uid()`'s org against the requested cycle and gates on the 8-respondent threshold before returning anything. There is no path that bypasses both.
- **Signals are ordered by `random()`** with the submitted-at column omitted from the function output. In a small team a chronological marker on the most recent comment is identifying.
- **The AI coach uses two database clients per request** — user messages persist via the RLS-scoped client (the `coach_messages` policy enforces `role = 'user'`), assistant messages persist via the service role on the server. A compromised client cannot forge an assistant turn or inject a system instruction.

---

## Database schema

Twelve tables, split across the core survey schema and the individual-growth schema:

**Core**
- `orgs` — tenants
- `users` — extends `auth.users`, carries `org_id` and `role`
- `categories` — six fixed leadership dimensions
- `questions` — question bank, tagged by category
- `cycles` — survey window (draft → open → closed)
- `cycle_questions` — which questions are bound to a cycle
- `responses` — the core write table (`cycle_id`, `question_id`, `user_id`, 1–10 score, optional comment)

**Growth**
- `coaching_notes` — private rich-text reflections
- `dev_plan_goals` — goal tracker per user
- `articles` — admin-curated reading list
- `coach_conversations` + `coach_messages` — AI coach history

Migrations live in `supabase/migrations/` and apply in timestamp order. All schema, RLS, and aggregate-function changes go through new migration files — never edit applied ones.

---

## Row-Level Security policies

Every user-data table has RLS enabled. Key invariants:

- **`orgs`, `users`, `cycles`, `cycle_questions`** — readable by members of the same org; writable only by `super_admin`.
- **`responses`** — users can INSERT/UPDATE only their own rows, and only into an `open` cycle in their own org. SELECT is restricted to `user_id = auth.uid()` so users can see what they submitted. Cross-row reads happen exclusively through aggregate functions.
- **`coaching_notes`, `dev_plan_goals`, `coach_conversations`** — strictly per-user; no cross-user visibility, including within the same org.
- **`coach_messages`** — INSERT restricted to `role = 'user'`; assistant and system messages are written server-side via the service role only.
- **`articles`, `categories`** — RLS enabled with explicit public SELECT (no ambiguous deny-by-default).

The `supabase/tests/isolation_test.sql` script verifies the critical guarantees: unauthenticated callers and cross-org callers get zero rows from every aggregate function. Run via `npm run db:test`.

---

## API surface

All endpoints under `/api/`. RLS-scoped clients are used everywhere except admin writes and AI-coach assistant-message writes, which explicitly use the service role.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/survey/active` | Active open cycle + question list + already-submitted flag |
| POST | `/api/survey/submit` | Atomic submit; 409 on double-submit, 403 on closed cycle |
| GET | `/api/dashboard/scores` | Threshold-gated; returns `insufficient_responses` when < 8 respondents |
| GET | `/api/dashboard/signals` | Random-order anonymous comments, no dates |
| GET | `/api/dashboard/trends` | Per-cycle per-category timeseries |
| GET | `/api/dashboard/employee` | Overall + strongest/weakest + recommended_articles |
| GET | `/api/dashboard/categories` | Category lookup with descriptions |
| GET/POST | `/api/growth/notes`, `/notes/[id]` | Private CRUD |
| GET/POST | `/api/growth/goals`, `/goals/[id]` | Private CRUD |
| GET | `/api/growth/articles` | Read-only, optional `?category_id=` filter |
| POST | `/api/coach/chat` | SSE stream; user message via RLS, assistant via service role |
| GET | `/api/coach/conversations`, `/[id]/messages` | History |
| POST/PATCH/DELETE | `/api/admin/orgs`, `/admin/users/invite`, `/admin/cycles[/id]`, `/admin/articles[/id]` | Super-admin only |

---

## Deployment

Production runs on **Vercel** with a hosted **Supabase** project in `eu-west-2` (London). The Vercel project is wired to the GitHub repo — pushes to `main` auto-deploy.

To wire up a new environment:

```bash
# 1. Create a Supabase project in the dashboard, copy the project ref + DB password.

# 2. Link the CLI and push migrations.
supabase link --project-ref <ref>
supabase db push

# 3. (Optional) seed the hosted DB. For real pilots, skip this — provision via /admin.
PGPASSWORD=<db-password> psql \
  "postgresql://postgres@db.<ref>.supabase.co:5432/postgres?sslmode=require" \
  -f supabase/seed.sql

# 4. Verify isolation on the hosted DB.
PGPASSWORD=<db-password> psql \
  "postgresql://postgres@db.<ref>.supabase.co:5432/postgres?sslmode=require" \
  -f supabase/tests/isolation_test.sql

# 5. Configure Vercel env vars:
#      NEXT_PUBLIC_SUPABASE_URL
#      NEXT_PUBLIC_SUPABASE_ANON_KEY
#      SUPABASE_SERVICE_ROLE_KEY
#      ANTHROPIC_API_KEY
#      NEXT_PUBLIC_APP_URL

# 6. Configure Supabase Auth → URL Configuration:
#      Site URL: <prod URL>
#      Redirect URLs: <prod URL>/**, http://localhost:3000/**

# 7. vercel --prod
```

---

## Roadmap

What's done:

- Phase 0–2 — schema, RLS, dashboards, growth section, AI coach
- Phase 3 (partial) — hosted Supabase, Vercel deploy, auth URL config
- Phase 4 — UI polish, trend charts, layout matching mockups

What's open:

- **Resend integration** — three transactional email triggers (cycle opens, day-4 reminder, cycle closes). Vercel Cron for the day-4 reminder.
- **First pilot data** — author the real 12-question bank (placeholder questions are seeded), finalise canonical category names, provision the first pilot org via `/admin`.
- **Demo data cleanup** — before sharing the prod URL with a real pilot, remove the seeded demo users from production.

See `STATUS.md` for the live next-actions list and `decisions.md` for architecture-decision history.

---

## Licence

MIT — see `LICENSE`.
