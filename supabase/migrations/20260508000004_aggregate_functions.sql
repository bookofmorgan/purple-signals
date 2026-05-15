-- Purple Signals — dashboard aggregate functions (Phase 0.3)
-- All SECURITY DEFINER. Org scope is verified against auth context internally.
-- See decisions.md (2026-05-08, security fixes) and 03-purple-signals-system-design.md §5.

-- ============================================================
-- get_cycle_scores(cycle_id) — category averages, threshold-gated
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_cycle_scores(p_cycle_id UUID)
RETURNS TABLE (
  category_id      UUID,
  category_name    TEXT,
  avg_score        NUMERIC(3,1),
  response_count   BIGINT,
  respondent_count BIGINT
) AS $$
BEGIN
  -- Org guard: refuse if caller is unauthenticated or cycle is not in caller's org.
  -- get_user_org_id() returns NULL for unauthenticated; (org_id = NULL) is never true → empty.
  IF NOT EXISTS (
    SELECT 1 FROM public.cycles
     WHERE id = p_cycle_id
       AND org_id = public.get_user_org_id()
  ) THEN
    RETURN;
  END IF;

  -- Threshold gate: minimum 8 distinct respondents.
  IF (SELECT COUNT(DISTINCT user_id) FROM public.responses WHERE cycle_id = p_cycle_id) < 8 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id   AS category_id,
    c.name AS category_name,
    ROUND(AVG(r.score)::numeric, 1) AS avg_score,
    COUNT(r.id)              AS response_count,
    COUNT(DISTINCT r.user_id) AS respondent_count
  FROM public.responses r
  JOIN public.questions  q ON r.question_id = q.id
  JOIN public.categories c ON q.category_id = c.id
  WHERE r.cycle_id = p_cycle_id
  GROUP BY c.id, c.name, c.sort_order
  ORDER BY c.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- ============================================================
-- get_cycle_trends(cycle_id) — current vs previous closed cycle
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_cycle_trends(p_cycle_id UUID)
RETURNS TABLE (
  category_id    UUID,
  category_name  TEXT,
  current_score  NUMERIC(3,1),
  previous_score NUMERIC(3,1),
  delta          NUMERIC(3,1),
  status         TEXT
) AS $$
DECLARE
  v_org_id           UUID;
  v_previous_cycle_id UUID;
BEGIN
  v_org_id := public.get_user_org_id();
  IF v_org_id IS NULL THEN RETURN; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.cycles WHERE id = p_cycle_id AND org_id = v_org_id
  ) THEN
    RETURN;
  END IF;

  -- Previous closed cycle in this org (by ends_at).
  SELECT id INTO v_previous_cycle_id
  FROM public.cycles
  WHERE org_id = v_org_id
    AND status = 'closed'
    AND id != p_cycle_id
    AND ends_at < (SELECT ends_at FROM public.cycles WHERE id = p_cycle_id)
  ORDER BY ends_at DESC
  LIMIT 1;

  RETURN QUERY
  WITH current_scores AS (
    SELECT * FROM public.get_cycle_scores(p_cycle_id)
  ),
  previous_scores AS (
    SELECT * FROM public.get_cycle_scores(v_previous_cycle_id)
  )
  SELECT
    cs.category_id,
    cs.category_name,
    cs.avg_score AS current_score,
    ps.avg_score AS previous_score,
    ROUND((cs.avg_score - COALESCE(ps.avg_score, cs.avg_score))::numeric, 1) AS delta,
    CASE
      WHEN cs.avg_score >= 7.2 THEN 'strong'
      WHEN cs.avg_score < 6.0  THEN 'needs_attention'
      ELSE 'stable'
    END AS status
  FROM current_scores cs
  LEFT JOIN previous_scores ps ON cs.category_id = ps.category_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- ============================================================
-- get_cycle_signals(cycle_id) — anonymous comments, random order, no dates
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_cycle_signals(p_cycle_id UUID)
RETURNS TABLE (
  comment       TEXT,
  category_name TEXT
) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.cycles WHERE id = p_cycle_id AND org_id = public.get_user_org_id()
  ) THEN
    RETURN;
  END IF;

  IF (SELECT COUNT(DISTINCT user_id) FROM public.responses WHERE cycle_id = p_cycle_id) < 8 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    r.comment,
    c.name AS category_name
  FROM public.responses r
  JOIN public.questions  q ON r.question_id = q.id
  JOIN public.categories c ON q.category_id = c.id
  WHERE r.cycle_id = p_cycle_id
    AND r.comment IS NOT NULL
    AND length(trim(r.comment)) > 0
  ORDER BY random();  -- random order prevents last-submitter identification
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- ============================================================
-- get_response_rate(cycle_id) — responded / total + percentage
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_response_rate(p_cycle_id UUID)
RETURNS TABLE (
  responded BIGINT,
  total     BIGINT,
  rate      NUMERIC(5,2)
) AS $$
DECLARE
  v_org_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.cycles WHERE id = p_cycle_id AND org_id = public.get_user_org_id()
  ) THEN
    RETURN;
  END IF;

  SELECT org_id INTO v_org_id FROM public.cycles WHERE id = p_cycle_id;

  RETURN QUERY
  SELECT
    (SELECT COUNT(DISTINCT user_id) FROM public.responses WHERE cycle_id = p_cycle_id),
    (SELECT COUNT(*) FROM public.users WHERE org_id = v_org_id AND role <> 'super_admin'),
    ROUND(
      (SELECT COUNT(DISTINCT user_id) FROM public.responses WHERE cycle_id = p_cycle_id)::numeric
      / NULLIF((SELECT COUNT(*) FROM public.users WHERE org_id = v_org_id AND role <> 'super_admin'), 0)
      * 100,
      1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- ============================================================
-- get_employee_dashboard(cycle_id) — overall + strongest/weakest, threshold-gated
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_employee_dashboard(p_cycle_id UUID)
RETURNS TABLE (
  overall_score    NUMERIC(3,1),
  strongest_name   TEXT,
  strongest_score  NUMERIC(3,1),
  weakest_name     TEXT,
  weakest_score    NUMERIC(3,1),
  weakest_category UUID
) AS $$
DECLARE
  v_overall NUMERIC(3,1);
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.cycles WHERE id = p_cycle_id AND org_id = public.get_user_org_id()
  ) THEN
    RETURN;
  END IF;

  IF (SELECT COUNT(DISTINCT user_id) FROM public.responses WHERE cycle_id = p_cycle_id) < 8 THEN
    RETURN;
  END IF;

  WITH scores AS (
    SELECT * FROM public.get_cycle_scores(p_cycle_id)
  ),
  ordered AS (
    SELECT
      *,
      RANK() OVER (ORDER BY avg_score DESC) AS rank_high,
      RANK() OVER (ORDER BY avg_score ASC)  AS rank_low
    FROM scores
  )
  SELECT
    ROUND(AVG(s.avg_score)::numeric, 1)                                     AS overall_score,
    (SELECT category_name FROM ordered WHERE rank_high = 1 LIMIT 1)         AS strongest_name,
    (SELECT avg_score     FROM ordered WHERE rank_high = 1 LIMIT 1)         AS strongest_score,
    (SELECT category_name FROM ordered WHERE rank_low  = 1 LIMIT 1)         AS weakest_name,
    (SELECT avg_score     FROM ordered WHERE rank_low  = 1 LIMIT 1)         AS weakest_score,
    (SELECT category_id   FROM ordered WHERE rank_low  = 1 LIMIT 1)         AS weakest_category
  INTO v_overall, strongest_name, strongest_score, weakest_name, weakest_score, weakest_category
  FROM scores s;

  overall_score := v_overall;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- ============================================================
-- has_user_submitted(cycle_id) — for survey page already-submitted check
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_user_submitted(p_cycle_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.responses
     WHERE cycle_id = p_cycle_id
       AND user_id  = auth.uid()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- ============================================================
-- Permissions: only authenticated callers (anon key included) may invoke.
-- Each function self-guards via auth.uid() / get_user_org_id().
-- ============================================================

GRANT EXECUTE ON FUNCTION public.get_cycle_scores(UUID)         TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_cycle_trends(UUID)         TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_cycle_signals(UUID)        TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_response_rate(UUID)        TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_employee_dashboard(UUID)   TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_user_submitted(UUID)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_org_id()              TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role()                TO authenticated, anon;
