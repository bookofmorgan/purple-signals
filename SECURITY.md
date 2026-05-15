# Security

Purple Signals' product value rests on two security guarantees:

1. **Cross-tenant isolation** — no user can read another organisation's data, under any circumstances.
2. **Respondent anonymity** — no leader can identify which team member submitted any particular response or comment.

If you find a way to break either, please report it to the maintainer privately rather than opening a public issue.

## How to report

Email: **morganswan@outlook.com**

Use a subject line that starts with `[SECURITY]`. Include:
- A description of the issue
- The smallest reproduction you can produce (steps, request payloads, code snippets)
- Your assessment of the impact

You should expect a reply within 48 hours.

## Scope

In scope:
- Anything that lets one org's data be read by a user in a different org (RLS bypass, missing org-scope check in an aggregate function, leakage through error messages, etc.)
- Anything that lets a leader identify an individual respondent (timestamp leak in signals, count-based reidentification with fewer than 8 responses, etc.)
- AuthN/AuthZ bypasses (privilege escalation, role-spoofing via the JWT, etc.)
- Server-side request forgery, SQL injection, or any way to execute arbitrary SQL against the database
- Forging assistant or system messages in the AI coach surface

Out of scope:
- Self-XSS (requires the user to paste a payload into the browser console)
- Issues that require a compromised superuser PostgreSQL session
- Brute-force or credential-stuffing against demo accounts in the public demo deploy
- Vulnerabilities in Supabase, Vercel, Anthropic, or other third-party services we depend on (please report those to the relevant vendor)

## Verification

The cross-org isolation guarantee is verified by `supabase/tests/isolation_test.sql`. It runs in CI on every push and must pass before any change is merged. The script asserts:

1. Unauthenticated callers receive zero rows from every aggregate function (`get_cycle_scores`, `get_cycle_trends`, `get_cycle_signals`, `get_response_rate`).
2. A user authenticated to Org A receives zero rows when calling any aggregate function with a cycle ID belonging to Org B.
3. The same Org A user can read their own org's aggregate data (positive test, prevents the guard from being a tautology).

If you change RLS policies or aggregate functions, run `npm run db:test` locally before pushing.

## What we will not do

- We will not negotiate bug bounties or financial rewards. This is a small project with no commercial bounty programme yet.
- We will not patch issues silently — fixes will be released with a brief explanation of what was wrong and what changed.
