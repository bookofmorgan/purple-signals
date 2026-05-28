# Journal

Append-only field notes, observations, and session summaries.
Format: `## YYYY-MM-DD — [Session summary]`

---

## 2026-05-28 — Cowork git pattern experiment: failed

Ran a series of tests trying to simplify the Cowork git sync pattern. Three proposed improvements all failed in practice:

1. **Session ID auto-resolve** — tried `$(ls /sessions/)` (expands to multi-line list, breaks path) and `$(hostname)` (returns `claude` in Cowork, not the session slug). Neither works. The `<session-id>` placeholder with manual `ls /sessions/` substitution is the only reliable method.

2. **Direct git from mount (Fix 3)** — tried running `git add/commit/push` directly from `$SESSION` (the Cowork mount path). Failed with `fatal: not a git repository`. The mount has no `.git` directory. Clone-to-tmp is required for all git operations, both pull and push.

3. **`rsync --delete`** — caused permission errors. The Cowork mount does not allow file unlinking. Without `--delete`, renames and deletions on the remote do not propagate to the mount, but that is the correct tradeoff given the constraint.

The one real improvement that came out of the experiment: **credential helper pattern** (PAT passed via `-c credential.helper=...` flag, never embedded in clone/push URLs). This was adopted and is now in CLAUDE.md for both patterns.

---

## 2026-05-08 — Project scaffolded

Project design phase complete. Four planning documents exist in the root: spec, architecture, system design, and roadmap.

Scaffolded the Cowork project structure today: created `CLAUDE.md`, `STATUS.md`, `journal.md`, `decisions.md` per the setup guide.

GitHub repo and PAT setup not yet done — next step before any code is written.

Three open questions are blocking the question bank (OQ-2, OQ-4, OQ-5). Phase 1 build can proceed with placeholder questions; real questions needed before pilot launch.

---

## 2026-05-08 — Phase 0 → Phase 2 build

Wrote the entire local-first MVP in one session:

- Next.js 14 (App Router) scaffold + Supabase CLI config (`supabase/config.toml`, `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.mjs`).
- Supabase migrations split into four files in apply order: schema → growth schema → RLS + helpers → aggregate functions. Helpers live in `public` schema with `SET search_path` per the security fix decision. Aggregate functions verify cycle's org against `auth.uid()` internally and gate on the 8-respondent threshold.
- Seed: 6 categories, 12 placeholder questions (2 per category), 1 demo org "Acme Co (Demo)", super admin + 9 demo users (so the seeded April Pulse passes the threshold), 1 closed cycle (April Pulse, ~108 responses) + 1 open cycle (May Pulse).
- Isolation test script asserts unauthenticated and cross-org calls to all aggregate functions return zero rows.
- App routes for login, accept-invite, all four /(admin) admin pages, /(app) leadership + employee dashboards, survey, and the four /(app)/growth pages (notes, plan, coach, articles). Sidebar shell with role-aware nav.
- Full API route set: survey (active/submit), dashboard (scores/signals/employee), admin (orgs, users/invite, cycles, articles), growth (notes, goals, articles), coach (chat with SSE streaming, conversations, conversation messages).
- AI coach uses Anthropic `claude-sonnet-4-6` with a per-user system prompt that pulls latest closed-cycle category scores, active dev plan goals, and recent coaching note snippets. Streams via SSE; client reconstructs the message progressively. Assistant messages persisted via service role; user messages via RLS-scoped client (so coach_messages INSERT policy restricts clients to `role='user'`).
- Tiptap rich-text editor for coaching notes; minimal toolbar (bold, italic, h2, lists, blockquote).
- README documents first-run, isolation gate, demo personas, and Phase 3 deploy steps. STATUS.md updated to reflect completion.

What's intentionally not built (Phase 3+, gated on founder demo sign-off): Resend email triggers, Vercel cron for day-4 reminders, remote Supabase project, trend chart component (Recharts) — all explicitly deferred per the roadmap.

Local environment couldn't be exercised in this session (no Node/Docker on the box used to write the code), so the build is unverified end-to-end. First task on a host with the toolchain installed: `npm install && supabase start && supabase db reset && npm run db:test && npm run dev`, then walk through the manual verification checklist in STATUS.md.
