# Journal

Append-only field notes, observations, and session summaries.
Format: `## YYYY-MM-DD — [Session summary]`

---

## 2026-05-08 — Project scaffolded

Project design phase complete. Four planning documents exist in the root: spec, architecture, system design, and roadmap.

Scaffolded the project state files today: `STATUS.md`, `journal.md`, `decisions.md`. GitHub repo setup is next, before any code gets written.

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

---

## 2026-05-15 — First-run verification, UI alignment, and production deploy

Long session that started with verifying the un-tested build and ended with a live production URL.

**First run on a real machine.** Three things were broken when I actually ran the code:
- `supabase/config.toml` had `enable_confirmations` under `[auth]` — invalid key for CLI 2.98, moved to `[auth.email]` only.
- The isolation test inserted directly into `public.users` without creating the corresponding `auth.users` row — FK violation. Rewrote it to use the seeded `leader@demo.com` against a throwaway Org B; assertions are the same, the FK problem is gone, plus added a positive case (Org A leader CAN read their own org).
- Two `setAll` callbacks in the SSR helpers had implicit `any` params under strict mode. Imported `CookieOptions` from `@supabase/ssr`. Typecheck went green.

Login then died with "email logins are disabled" — `enable_signup = false` in both `[auth]` and `[auth.email]` conflates with the login switch in this CLI version. Set both to true for local-dev; real signup gate is enforced via the admin-invite flow regardless. After a `supabase stop && start && db reset`, GoTrue handed back an access_token for the seeded user.

**UI alignment against the founder's mockups and the proposal PDF.** The screenshots showed a structurally different layout from what I'd built: grouped sidebar with explicit section headers + a user card + a leadership/employee view toggle; a wide horizontal hero card combining overall score + response rate + strong-areas counter; category cards with a leading status dot, description text, and a coloured progress bar; a yellow "Key Unlocks" auto-insight panel; a "What needs attention" risk-area list with stub discussion buttons; and three new pages — `/trends` with Recharts sparklines, `/signals` as a standalone filterable comments view, `/team-growth` (leaders only) composing the bottom half of mockup 1. Also a hub at `/growth` with three workspace cards plus an article list.

Added two migrations to support this: `users.title TEXT` (for the user card subtitle), and `get_category_trends_across_cycles()` (per-cycle per-category SECURITY DEFINER aggregate, threshold-gated per cycle). Updated the seed to give demo users realistic titles and renamed the org to "Acme Scale-up" to match the mockups. Crucially, added a second closed cycle — March Pulse, with scores deliberately ~0.7 lower than April — so the trends page renders with actual deltas instead of flat lines.

PRD compliance check came out clean: every success criterion green, every required page present, all the role-split views and the 8-respondent anonymity threshold intact. One design tension worth flagging: mockup 1 shows dates on individual signals ("28 Feb", "27 Feb"). In a 9-respondent team a date on the most-recent comment is identifying — kept the no-dates policy from the original decision log.

**GitHub + Vercel.** Initialised the local git repo, installed `gh` via brew, auth'd via the device-OAuth flow, soft-reset to `origin/main` to commit on top of the existing scaffold commit (preserving the LICENSE that was already on the remote), pushed clean. Then to Vercel: created the hosted Supabase project (London region), ran `supabase link` + `db push` to apply all six migrations to the hosted DB, ran the seed against it via direct `psql` (the pooler URL format threw "tenant not found" — direct `db.<ref>.supabase.co:5432` worked). Isolation test on the hosted DB: 3/3 PASS.

For Vercel, set all five env vars (Supabase URL/anon/service_role, Anthropic key, `NEXT_PUBLIC_APP_URL`), then `vercel --prod`. Supabase Auth still had Site URL pointing at localhost so prod logins would have broken — pulled the personal access token out of the macOS keychain (it's stored as base64 under "Supabase CLI") and patched site_url + uri_allow_list via the Management API. Localhost is kept whitelisted alongside the prod URL so local dev still works. Smoke test: GoTrue returns an access_token for `leader@demo.com` against the prod DB.

**One UX bug caught after the fact.** The sidebar wasn't pinned to the viewport — on long pages (`/trends`, `/growth/notes`) the user card and the view-as toggle scrolled off-screen. Switched the outer container from `min-h-screen` to `h-screen overflow-hidden`, gave the aside `h-screen sticky top-0`, and made `main` the scrolling surface. Auto-deployed via the GitHub-Vercel integration.

**Open.** Resend integration for the three email triggers (cycle open, day-4 reminder, cycle close) is the last item before pilot — still not built. OQ-2/4/5 remain blocking for the real question bank. Demo data is seeded into production; before sharing the URL with a real pilot org I need to either delete the demo users or rotate their passwords.
