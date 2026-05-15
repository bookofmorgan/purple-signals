-- Purple Signals — RLS isolation test (Phase 0.3 gate)
-- Spec: roadmap §Phase 0 gate. Run with `npm run db:test` or
--   docker exec -i supabase_db_purple-signals psql -U postgres -d postgres < supabase/tests/isolation_test.sql
--
-- Strategy: use the seeded "Acme Co (Demo)" org and its leader@demo.com user
-- (already authenticated in the auth schema), then create a *separate* throwaway
-- Org B with its own cycle. Assert that the seeded leader, who belongs to Org A,
-- cannot see Org B's data via any aggregate function.

\set ON_ERROR_STOP on

DO $$
DECLARE
  v_leader_a UUID;
  v_org_b    UUID;
  v_cycle_b  UUID;
  v_question UUID;
  v_count    INT;
BEGIN
  RAISE NOTICE '==> Looking up seeded leader@demo.com (Org A user)';
  SELECT id INTO v_leader_a FROM public.users WHERE email = 'leader@demo.com';
  IF v_leader_a IS NULL THEN
    RAISE EXCEPTION 'Setup error: leader@demo.com not found. Run `supabase db reset` first.';
  END IF;

  RAISE NOTICE '==> Creating throwaway Org B with a closed cycle';
  v_org_b   := gen_random_uuid();
  v_cycle_b := gen_random_uuid();

  INSERT INTO orgs (id, name, slug)
    VALUES (v_org_b, 'Test Org B', 'test-org-b-' || substring(v_org_b::text from 1 for 6));

  INSERT INTO cycles (id, org_id, title, starts_at, ends_at, status) VALUES
    (v_cycle_b, v_org_b, 'B Cycle',
     now() - INTERVAL '14 days', now() - INTERVAL '7 days', 'closed');

  v_question := (SELECT id FROM questions LIMIT 1);
  INSERT INTO cycle_questions (cycle_id, question_id) VALUES (v_cycle_b, v_question);

  -- ------------------------------------------------------------------
  RAISE NOTICE '==> Test 1: unauthenticated call returns empty for every fn';
  -- ------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims',    '', true);

  SELECT count(*) INTO v_count FROM public.get_cycle_scores(v_cycle_b);
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL: unauthenticated get_cycle_scores returned % rows', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.get_response_rate(v_cycle_b);
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL: unauthenticated get_response_rate returned % rows', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.get_cycle_signals(v_cycle_b);
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL: unauthenticated get_cycle_signals returned % rows', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.get_cycle_trends(v_cycle_b);
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL: unauthenticated get_cycle_trends returned % rows', v_count; END IF;
  RAISE NOTICE '   PASS — all 4 functions returned empty for unauthenticated caller';

  -- ------------------------------------------------------------------
  RAISE NOTICE '==> Test 2: Org A leader cannot read Org B''s cycle data';
  -- ------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', v_leader_a::text, true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_leader_a::text, 'role', 'authenticated')::text, true);

  SELECT count(*) INTO v_count FROM public.get_cycle_scores(v_cycle_b);
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL: leader saw % Org B score rows', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.get_response_rate(v_cycle_b);
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL: leader saw % Org B rate rows', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.get_cycle_signals(v_cycle_b);
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL: leader saw % Org B signal rows', v_count; END IF;

  SELECT count(*) INTO v_count FROM public.get_cycle_trends(v_cycle_b);
  IF v_count <> 0 THEN RAISE EXCEPTION 'FAIL: leader saw % Org B trend rows', v_count; END IF;
  RAISE NOTICE '   PASS — Org A leader cannot read Org B data via any aggregate fn';

  -- ------------------------------------------------------------------
  RAISE NOTICE '==> Test 3: Org A leader CAN read their own Org A cycle';
  -- ------------------------------------------------------------------
  -- Sanity check: confirm the auth context is wired correctly by reading
  -- the seeded April Pulse (closed, 9 respondents, threshold satisfied).
  DECLARE
    v_cycle_a UUID;
  BEGIN
    SELECT id INTO v_cycle_a FROM cycles
      WHERE status = 'closed'
        AND org_id = (SELECT org_id FROM users WHERE id = v_leader_a)
      LIMIT 1;

    SELECT count(*) INTO v_count FROM public.get_cycle_scores(v_cycle_a);
    IF v_count = 0 THEN
      RAISE EXCEPTION 'FAIL: leader could not read own Org A scores (got 0 rows for cycle %)', v_cycle_a;
    END IF;
    RAISE NOTICE '   PASS — leader sees % category rows for their own org', v_count;
  END;

  -- ------------------------------------------------------------------
  RAISE NOTICE '==> Cleanup';
  -- ------------------------------------------------------------------
  DELETE FROM cycle_questions WHERE cycle_id = v_cycle_b;
  DELETE FROM cycles          WHERE id       = v_cycle_b;
  DELETE FROM orgs            WHERE id       = v_org_b;

  RAISE NOTICE '';
  RAISE NOTICE '✅ ALL ISOLATION TESTS PASSED';
END $$;
