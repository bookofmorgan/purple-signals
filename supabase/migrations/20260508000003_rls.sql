-- Purple Signals — RLS policies, helper functions, aggregate functions (Phase 0.3)
-- See docs/system-design.md §4 and §5

-- ============================================================
-- Helper functions (live in public schema, NOT auth, with explicit search_path)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- ============================================================
-- Enable RLS (deny-all by default)
-- ============================================================

ALTER TABLE orgs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_questions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_notes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_plan_goals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_messages    ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Public-read tables (categories, articles, questions)
-- ============================================================

CREATE POLICY "Anyone can read categories"
  ON categories FOR SELECT USING (true);

CREATE POLICY "Anyone can read active articles"
  ON articles FOR SELECT USING (is_active = true OR public.get_user_role() = 'super_admin');

CREATE POLICY "Super admin can manage articles"
  ON articles FOR ALL
  USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');

CREATE POLICY "Authenticated users can read questions"
  ON questions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admin can manage questions"
  ON questions FOR ALL
  USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');

-- ============================================================
-- Orgs
-- ============================================================

CREATE POLICY "Users can view own org"
  ON orgs FOR SELECT
  USING (id = public.get_user_org_id() OR public.get_user_role() = 'super_admin');

CREATE POLICY "Super admin can manage orgs"
  ON orgs FOR ALL
  USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');

-- ============================================================
-- Users
-- ============================================================

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can view org members"
  ON users FOR SELECT
  USING (org_id IS NOT NULL AND org_id = public.get_user_org_id());

CREATE POLICY "Super admin can view all users"
  ON users FOR SELECT
  USING (public.get_user_role() = 'super_admin');

CREATE POLICY "Super admin can manage users"
  ON users FOR INSERT
  WITH CHECK (public.get_user_role() = 'super_admin');

CREATE POLICY "Super admin can update users"
  ON users FOR UPDATE
  USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');

CREATE POLICY "Super admin can delete users"
  ON users FOR DELETE
  USING (public.get_user_role() = 'super_admin');

-- ============================================================
-- Cycles
-- ============================================================

CREATE POLICY "Users can view org cycles"
  ON cycles FOR SELECT
  USING (org_id = public.get_user_org_id() OR public.get_user_role() = 'super_admin');

CREATE POLICY "Super admin can manage cycles"
  ON cycles FOR ALL
  USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');

-- ============================================================
-- Cycle questions
-- ============================================================

CREATE POLICY "Users can view cycle questions"
  ON cycle_questions FOR SELECT
  USING (
    cycle_id IN (SELECT id FROM cycles WHERE org_id = public.get_user_org_id())
    OR public.get_user_role() = 'super_admin'
  );

CREATE POLICY "Super admin can manage cycle questions"
  ON cycle_questions FOR ALL
  USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');

-- ============================================================
-- Responses
-- ============================================================

CREATE POLICY "Users can submit own responses"
  ON responses FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND cycle_id IN (
      SELECT id FROM cycles
      WHERE org_id = public.get_user_org_id()
        AND status = 'open'
    )
    AND question_id IN (
      SELECT cq.question_id FROM cycle_questions cq WHERE cq.cycle_id = responses.cycle_id
    )
  );

CREATE POLICY "Users can update own responses"
  ON responses FOR UPDATE
  USING (
    user_id = auth.uid()
    AND cycle_id IN (
      SELECT id FROM cycles
      WHERE status = 'open' AND org_id = public.get_user_org_id()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND cycle_id IN (
      SELECT id FROM cycles
      WHERE status = 'open' AND org_id = public.get_user_org_id()
    )
  );

CREATE POLICY "Users can view own responses"
  ON responses FOR SELECT
  USING (user_id = auth.uid());

-- Dashboards read aggregates via SECURITY DEFINER functions; no SELECT-all policy.

-- ============================================================
-- Coaching notes (private per user)
-- ============================================================

CREATE POLICY "Users CRUD own coaching notes"
  ON coaching_notes FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Dev plan goals (private per user)
-- ============================================================

CREATE POLICY "Users CRUD own dev plan goals"
  ON dev_plan_goals FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Coach conversations (private per user)
-- ============================================================

CREATE POLICY "Users CRUD own coach conversations"
  ON coach_conversations FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Coach messages
-- Clients may insert role='user' only; assistant/system written via service role.
-- ============================================================

CREATE POLICY "Users insert own user-role coach messages"
  ON coach_messages FOR INSERT
  WITH CHECK (
    role = 'user'
    AND conversation_id IN (
      SELECT id FROM coach_conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users read own coach messages"
  ON coach_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM coach_conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users delete own coach messages"
  ON coach_messages FOR DELETE
  USING (
    conversation_id IN (
      SELECT id FROM coach_conversations WHERE user_id = auth.uid()
    )
  );
