# Contributing

Thanks for picking this up. The repo is small and conventions are light, but a few things are worth knowing before you change much.

## Setup

See [`README.md`](README.md#local-development) for first-run instructions. The short version:

```bash
nvm use                                  # Node 20 (matches .nvmrc)
npm install
supabase start                           # local Postgres + Auth + Studio
cp .env.example .env.local               # paste the keys supabase printed
supabase db reset
npm run db:test                          # isolation gate must pass
npm run dev
```

## What "good" looks like

- **All database queries go through RLS-scoped clients** (`@/lib/supabase/server` or `@/lib/supabase/client`) — except admin writes and AI-coach assistant-message persistence, which use the service-role client (`@/lib/supabase/admin`). These exceptions are intentional and minimal; do not extend them.
- **No direct SELECT on `responses`** from any user-facing route. Dashboards read aggregated data exclusively through the SECURITY DEFINER functions in `supabase/migrations/20260508000004_aggregate_functions.sql` and `…000006_trends_function.sql`.
- **The 8-respondent threshold is enforced in the database functions, not the UI.** When you add a new aggregate function, replicate the org-scope guard and threshold check from the existing ones.
- **Migrations are append-only.** Never edit an applied migration — create a new one. Migration filenames are timestamp-prefixed (`YYYYMMDDHHMMSS_name.sql`) and apply in alphabetical order.
- **The isolation test (`supabase/tests/isolation_test.sql`) must pass** after any RLS or aggregate-function change. CI runs `npm run db:test` automatically.

## Local checks before pushing

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
npm run build        # next build
npm run db:test      # isolation gate
```

CI runs the same checks on push and on pull request.

## Code style

- **Formatting**: Prettier with the config in `.prettierrc.json`. Run `npm run format` to fix.
- **Imports**: use the `@/` path alias for everything under `src/`.
- **Comments**: explain non-obvious decisions, not what the code does. Reference [`docs/decisions.md`](docs/decisions.md) when the reason for a piece of code is recorded there.

## Branching and commits

- Work on a feature branch off `main`, open a PR.
- Commit messages: short imperative ("Add trend chart", not "Added trend chart" or "Adding trend chart"). One logical change per commit.
- Squash trivial fix-up commits before merging.

## Decisions

Significant choices — architecture, security, data model, sequencing — go in [`docs/decisions.md`](docs/decisions.md) as a new dated entry. Format follows the existing entries.

Open questions blocking the build go in [`docs/spec.md`](docs/spec.md) under "Open Questions" and are tracked in [`docs/STATUS.md`](docs/STATUS.md).

## Reporting issues

For functional bugs, open a GitHub issue with reproduction steps. For security concerns (especially anything affecting the anonymity guarantee or cross-org isolation), see [`SECURITY.md`](SECURITY.md).
