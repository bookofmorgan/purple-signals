# STATUS

**Last updated:** 2026-05-15
**Current phase:** Phase 3 partial — live on Vercel + hosted Supabase. Resend email integration is the remaining item.
**Overall status:** 🟢 Production deploy stable; ready for founder demo. Two pre-pilot blockers (Resend + real question bank).

---

## Current State

App is live at **https://purple-signals.vercel.app**, backed by a hosted Supabase project in London (`eu-west-2`). All six migrations applied, demo seed in place (10 users, 6 categories, 12 questions, 3 cycles, 216 responses, 6 articles). Cross-org isolation verified on prod via the same SQL test that runs locally.

What's working end-to-end:
- Email/password auth (demo users at `*@demo.com` / `password`)
- Full survey submission flow with already-submitted state and the 409/403 error paths
- Leadership dashboard with hero stats, six category cards (dot + status badge + delta + progress bar), Key Unlocks auto-insights, What Needs Attention list
- Employee dashboard with overall score, strongest/weakest, recommended reading
- Trends page with Recharts overall sparkline + per-dimension mini-charts
- Standalone Signals page with category filters (no dates — anonymity guarantee)
- Team Growth view for leaders combining signals + key unlocks + needs-attention
- Individual Growth hub linking to Coaching Notes (Tiptap), Personal Development Plan, AI Coach, and Articles
- AI Leadership Coach streaming via SSE, context-aware (latest cycle scores + active goals + recent notes)
- Super-admin panel for orgs / bulk-invite / cycle management / article curation

Continuous deploy is wired: any `git push origin main` triggers a Vercel production build automatically.

---

## Next Actions

1. **Resend integration** — three email triggers (cycle opens → all users; day-4 reminder → non-respondents; cycle closes → leaders only). Vercel Cron for the day-4 trigger.
2. **Pilot data hygiene** — delete demo users + their cycles from the hosted DB before sharing the production URL with any real pilot. Or rotate the demo passwords. Currently anyone who knows `password` can sign in as a demo persona.
3. **Resolve OQ-2 / OQ-4 / OQ-5** — author the real 12-question bank and confirm canonical category names ("Fresh Feedback" / "Alignment" vs the original "Feedback" / "Collaboration"). The screenshots and current build use the former.
4. **First pilot org** — once questions are in and email triggers work, create the first real org via `/admin`, invite the first pilot team.

---

## Blocking Open Questions

These remain unresolved (none block further development; all block the first real cycle):

| ID | Question | Blocking |
|----|----------|---------|
| OQ-2 | Exact wording of the 12 questions (2 per category) | First cycle |
| OQ-4 | "Tail components" — additional questions or a 7th+ category? | Question-bank structure |
| OQ-5 | Confirm canonical category names — "Fresh Feedback" / "Alignment" (build + screenshots) vs original "Feedback" / "Collaboration" | All scoring + trend output |

---

## Phase Progress

### Phase 0 — Local Foundation ✅
| Task | Status |
|------|--------|
| Local Supabase CLI setup, env, scripts | ✅ |
| Schema + growth schema migrations | ✅ |
| RLS policies + helper + aggregate functions | ✅ |
| Seed data (categories, questions, demo org, two closed cycles, open cycle) | ✅ |
| Cross-org isolation test script | ✅ |

### Phase 1 — Core Loop ✅
| Task | Status |
|------|--------|
| Auth flow + protected layouts + role redirects | ✅ |
| Admin panel (orgs / users / cycles / articles) | ✅ |
| Survey page + atomic submit + already-submitted state | ✅ |
| Leadership dashboard (scores / trends / signals / response rate / threshold gate) | ✅ |
| Employee dashboard | ✅ |

### Phase 2 — Individual Growth ✅
| Task | Status |
|------|--------|
| Growth schema + RLS (notes, goals, articles, coach_*) | ✅ |
| Coaching notes (Tiptap CRUD) | ✅ |
| Personal development plan (goal CRUD + status toggle) | ✅ |
| Articles (admin CRUD + user surface + employee-dashboard recommendations) | ✅ |
| AI coach (streaming SSE, context-aware system prompt, conversation persistence) | ✅ |

### Phase 3 — External Services + Hosting 🟡
| Task | Status |
|------|--------|
| Remote Supabase project (London) | ✅ |
| Vercel deployment + production env vars | ✅ |
| Supabase Auth Site URL + redirect URLs configured | ✅ |
| Email notifications (Resend) — three triggers | ⬜ Not started |
| Production invite flow + Inbucket-to-real-SMTP cutover | ⬜ Depends on Resend |

### Phase 4 — UI Polish + Trend Charts ✅ (done early)
| Task | Status |
|------|--------|
| Grouped sidebar, user card, view-as toggle | ✅ |
| Hero stats card, upgraded category cards | ✅ |
| Key Unlocks + What Needs Attention | ✅ |
| Trends page with Recharts | ✅ |
| Standalone Signals + Team Growth + Growth Hub | ✅ |

_Phase 4 was completed earlier than the roadmap predicted because the founder mockups required it before the demo._

---

## Verification

Latest run (2026-05-15) on the production stack:
- ✅ `npm run db:test` — 3/3 isolation cases PASS on hosted DB
- ✅ `tsc --noEmit` — clean
- ✅ `next build` — 22 routes compiled, no errors
- ✅ `GET https://purple-signals.vercel.app/login` → 200
- ✅ GoTrue password grant for `leader@demo.com` returns valid `access_token`
