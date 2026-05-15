-- Purple Signals — cross-cycle trends function for the /trends page.
-- Returns one row per (category, closed cycle) for the caller's org, ordered chronologically.
-- Threshold gate applies per-cycle: cycles with < 8 respondents are dropped.

CREATE OR REPLACE FUNCTION public.get_category_trends_across_cycles()
RETURNS TABLE (
  cycle_id      UUID,
  cycle_title   TEXT,
  ends_at       TIMESTAMPTZ,
  category_id   UUID,
  category_name TEXT,
  sort_order    INT,
  avg_score     NUMERIC(3,1)
) AS $$
DECLARE
  v_org_id UUID;
BEGIN
  v_org_id := public.get_user_org_id();
  IF v_org_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH eligible_cycles AS (
    SELECT c.id, c.title, c.ends_at
    FROM public.cycles c
    WHERE c.org_id = v_org_id
      AND c.status = 'closed'
      AND (
        SELECT COUNT(DISTINCT user_id)
        FROM public.responses r
        WHERE r.cycle_id = c.id
      ) >= 8
  )
  SELECT
    ec.id   AS cycle_id,
    ec.title AS cycle_title,
    ec.ends_at,
    cat.id   AS category_id,
    cat.name AS category_name,
    cat.sort_order,
    ROUND(AVG(r.score)::numeric, 1) AS avg_score
  FROM eligible_cycles ec
  JOIN public.responses r ON r.cycle_id = ec.id
  JOIN public.questions q ON r.question_id = q.id
  JOIN public.categories cat ON q.category_id = cat.id
  GROUP BY ec.id, ec.title, ec.ends_at, cat.id, cat.name, cat.sort_order
  ORDER BY ec.ends_at ASC, cat.sort_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_category_trends_across_cycles() TO authenticated, anon;
