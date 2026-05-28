# Purple Signals — System Design

**Date:** 2026-05-08

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Vercel                            │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Next.js App (App Router)              │  │
│  │                                                     │  │
│  │  /app                                               │  │
│  │    /(auth)/login                 Auth pages         │  │
│  │    /(app)/dashboard              Leader dashboard   │  │
│  │    /(app)/team                   Employee dashboard │  │
│  │    /(app)/survey                 Survey page        │  │
│  │    /(app)/growth/notes           Coaching notes     │  │
│  │    /(app)/growth/plan            Dev plan           │  │
│  │    /(app)/growth/coach           AI coach chat      │  │
│  │    /(app)/growth/articles        Articles list      │  │
│  │    /(admin)/admin                Admin panel        │  │
│  │                                                     │  │
│  │  /app/api                                           │  │
│  │    /api/survey/active             GET active cycle   │  │
│  │    /api/survey/submit            POST responses     │  │
│  │    /api/dashboard/scores         GET aggregates     │  │
│  │    /api/dashboard/signals        GET comments       │  │
│  │    /api/coach/chat               POST chat message  │  │
│  │    /api/admin/orgs               CRUD orgs          │  │
│  │    /api/admin/users              Bulk invite        │  │
│  │    /api/admin/cycles             CRUD cycles        │  │
│  │    /api/notify/cycle-open        POST send emails   │  │
│  │    /api/notify/reminder          POST (cron)        │  │
│  │    /api/notify/cycle-close       POST send emails   │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────┘
                           │
                           │ Supabase JS Client + Service Role Key (API routes)
                           │
┌──────────────────────────▼──────────────────────────────┐
│                      Supabase                            │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Postgres    │  │     Auth     │  │   Storage     │  │
│  │   + RLS       │  │  (GoTrue)    │  │  (if needed)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────┐                                        │
│  │  pg_cron     │  Day-4 reminder trigger                │
│  └──────────────┘                                        │
└──────────────────────────────────────────────────────────┘
                           │
                           │ (API routes call externally)
                           │
              ┌────────────▼───────────┐
              │   Resend (email)       │
              │   Anthropic/OpenAI     │
              │   (AI coach)           │
              └────────────────────────┘
```

---

## 2. Database Schema

### Core Tables

```sql
-- Tenants
CREATE TABLE orgs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Users (extends Supabase auth.users)
CREATE TABLE users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id      UUID REFERENCES orgs(id),  -- nullable: super_admin users have no org
  email       TEXT NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('super_admin', 'leader', 'employee')),
  created_at  TIMESTAMPTZ DEFAULT now()
);
-- Note: application logic must enforce that leader/employee roles always have org_id set.
CREATE INDEX idx_users_org ON users(org_id);

-- Leadership categories (seeded, static)
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order  INT NOT NULL DEFAULT 0
);

-- Question bank
CREATE TABLE questions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id),
  text        TEXT NOT NULL,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_questions_category ON questions(category_id);

-- Survey cycles
CREATE TABLE cycles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES orgs(id),
  title       TEXT NOT NULL,
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_cycles_org ON cycles(org_id);
CREATE INDEX idx_cycles_status ON cycles(org_id, status);

-- Which questions are included in a cycle
CREATE TABLE cycle_questions (
  cycle_id    UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  PRIMARY KEY (cycle_id, question_id)
);

-- Individual survey responses (the core write table)
CREATE TABLE responses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id    UUID NOT NULL REFERENCES cycles(id),
  question_id UUID NOT NULL REFERENCES questions(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  score       INT NOT NULL CHECK (score >= 1 AND score <= 10),
  comment     TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (cycle_id, question_id, user_id)
);
CREATE INDEX idx_responses_cycle ON responses(cycle_id);
CREATE INDEX idx_responses_user_cycle ON responses(user_id, cycle_id);
```

### Individual Growth Tables

```sql
-- Coaching notes (private per user)
CREATE TABLE coaching_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_coaching_notes_user ON coaching_notes(user_id);

-- Development plan goals (private per user)
CREATE TABLE dev_plan_goals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'not_started'
                CHECK (status IN ('not_started', 'in_progress', 'complete')),
  target_date DATE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_dev_plan_goals_user ON dev_plan_goals(user_id);

-- Curated articles (admin-managed, read-only for users)
CREATE TABLE articles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  url             TEXT NOT NULL,
  category_id     UUID REFERENCES categories(id),
  read_time_min   INT,
  sort_order      INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### AI Coach Tables

```sql
-- Chat conversations (one user can have multiple)
CREATE TABLE coach_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  title       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_coach_conversations_user ON coach_conversations(user_id);

-- Chat messages
CREATE TABLE coach_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES coach_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_coach_messages_conversation ON coach_messages(conversation_id);
```

---

## 3. Seed Data

```sql
-- Categories
INSERT INTO categories (name, description, sort_order) VALUES
  ('Direction Setting', 'Clarity of strategic vision, priorities, and communication of what matters most.', 1),
  ('Culture', 'Alignment between stated values and daily behaviours and standards.', 2),
  ('Performance Management', 'Accountability, expectations, and commitment to results across the organisation.', 3),
  ('Fresh Feedback', 'Quality, frequency, and psychological safety of feedback loops.', 4),
  ('Ownership', 'Responsibility, decision clarity, and autonomous problem-solving.', 5),
  ('Alignment', 'Coordination across teams, shared priorities, and smooth flow of work.', 6);

-- NOTE: The actual question text must be authored by the founder.
-- Placeholder structure for 12 questions (2 per category):
-- INSERT INTO questions (category_id, text) VALUES
--   ((SELECT id FROM categories WHERE name = 'Direction Setting'), 'Question 1 text here'),
--   ((SELECT id FROM categories WHERE name = 'Direction Setting'), 'Question 2 text here'),
--   ... (repeat for each category)
```

---

## 4. Row-Level Security Policies

```sql
-- Enable RLS on all tables
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_plan_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;
-- articles and categories: RLS enabled with explicit public-read policy (do NOT leave RLS disabled)
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Helper functions live in public schema, NOT auth schema (avoids collision with Supabase internals)
-- SECURITY DEFINER + explicit search_path prevents schema-injection attacks
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- ARTICLES / CATEGORIES: public read (no auth required)
CREATE POLICY "Anyone can read articles"
  ON articles FOR SELECT USING (true);

CREATE POLICY "Anyone can read categories"
  ON categories FOR SELECT USING (true);

-- ORGS: regular users can read their own org; super_admin can read all orgs
CREATE POLICY "Users can view own org"
  ON orgs FOR SELECT
  USING (id = public.get_user_org_id() OR public.get_user_role() = 'super_admin');

-- ORGS: only super_admin can write orgs (used via service role in admin routes — belt-and-suspenders)
CREATE POLICY "Super admin can manage orgs"
  ON orgs FOR ALL
  USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');

-- USERS: users can read other users in their org; super_admin can read all users
CREATE POLICY "Users can view org members"
  ON users FOR SELECT
  USING (org_id = public.get_user_org_id() OR public.get_user_role() = 'super_admin');

-- USERS: super_admin can write users (for bulk invite)
CREATE POLICY "Super admin can manage users"
  ON users FOR ALL
  USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');

-- CYCLES: regular users can read cycles for their own org; super_admin can read all
CREATE POLICY "Users can view org cycles"
  ON cycles FOR SELECT
  USING (org_id = public.get_user_org_id() OR public.get_user_role() = 'super_admin');

-- CYCLES: only super_admin can create/update/delete cycles
CREATE POLICY "Super admin can manage cycles"
  ON cycles FOR ALL
  USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');

-- CYCLE_QUESTIONS: users can read questions for their org's cycles
CREATE POLICY "Users can view cycle questions"
  ON cycle_questions FOR SELECT
  USING (
    cycle_id IN (SELECT id FROM cycles WHERE org_id = public.get_user_org_id())
    OR public.get_user_role() = 'super_admin'
  );

-- CYCLE_QUESTIONS: super_admin can write
CREATE POLICY "Super admin can manage cycle questions"
  ON cycle_questions FOR ALL
  USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');

-- RESPONSES: users can insert their own responses, but only for open cycles in their org
-- Enforcing at RLS level means this holds even for direct Supabase client calls
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
      SELECT question_id FROM cycle_questions WHERE cycle_id = responses.cycle_id
    )
  );

-- RESPONSES: users can update their own responses only while the cycle is still open
CREATE POLICY "Users can update own responses"
  ON responses FOR UPDATE
  USING (
    user_id = auth.uid()
    AND cycle_id IN (SELECT id FROM cycles WHERE status = 'open' AND org_id = public.get_user_org_id())
  );

-- RESPONSES: users can read ONLY their own responses (to check submission status)
-- Dashboard aggregates are served through SECURITY DEFINER functions, NOT direct SELECT
CREATE POLICY "Users can view own responses"
  ON responses FOR SELECT
  USING (user_id = auth.uid());

-- COACHING NOTES: private to user
CREATE POLICY "Users can CRUD own coaching notes"
  ON coaching_notes FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DEV PLAN GOALS: private to user
CREATE POLICY "Users can CRUD own dev plan goals"
  ON dev_plan_goals FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- COACH CONVERSATIONS: private to user
CREATE POLICY "Users can CRUD own coach conversations"
  ON coach_conversations FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- COACH MESSAGES: private to user via conversation ownership
-- INSERT also blocks role = 'system' — only 'user' and 'assistant' allowed from client
-- Assistant messages are written server-side via service role key only
CREATE POLICY "Users can insert own coach messages"
  ON coach_messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM coach_conversations WHERE user_id = auth.uid()
    )
    AND role = 'user'  -- clients can only insert 'user' role; 'assistant'/'system' written server-side
  );

CREATE POLICY "Users can read own coach messages"
  ON coach_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM coach_conversations WHERE user_id = auth.uid()
    )
  );
```

---

## 5. Dashboard Aggregate Functions

These are the only way dashboard data reaches the client. No direct `responses` table access.

```sql
-- Get category scores for a cycle (leadership dashboard)
CREATE OR REPLACE FUNCTION get_cycle_scores(p_cycle_id UUID)
RETURNS TABLE (
  category_id UUID,
  category_name TEXT,
  avg_score NUMERIC(3,1),
  response_count BIGINT,
  respondent_count BIGINT
) AS $$
BEGIN
  -- Guard: SECURITY DEFINER bypasses RLS — enforce org scope explicitly.
  -- auth.uid() NULL (unauthenticated) means get_user_org_id() returns NULL,
  -- and EXISTS(...AND org_id = NULL) is always false — safe, returns empty.
  IF NOT EXISTS (
    SELECT 1 FROM cycles WHERE id = p_cycle_id AND org_id = public.get_user_org_id()
  ) THEN
    RETURN;
  END IF;

  -- Only return data if minimum threshold met
  IF (SELECT COUNT(DISTINCT user_id) FROM responses WHERE cycle_id = p_cycle_id) < 8 THEN
    RETURN; -- returns empty set
  END IF;

  RETURN QUERY
  SELECT
    c.id AS category_id,
    c.name AS category_name,
    ROUND(AVG(r.score)::numeric, 1) AS avg_score,
    COUNT(r.id) AS response_count,
    COUNT(DISTINCT r.user_id) AS respondent_count
  FROM responses r
  JOIN questions q ON r.question_id = q.id
  JOIN categories c ON q.category_id = c.id
  WHERE r.cycle_id = p_cycle_id
  GROUP BY c.id, c.name
  ORDER BY c.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Get trend deltas (current cycle vs previous cycle)
-- NOTE: org_id is derived from auth context internally — never accept as caller parameter.
-- The old signature took p_org_id UUID; removed to eliminate NULL-bypass vulnerability where
-- NULL != NULL evaluates to NULL (falsy), letting unauthenticated callers skip the guard.
CREATE OR REPLACE FUNCTION get_cycle_trends(p_cycle_id UUID)
RETURNS TABLE (
  category_id UUID,
  category_name TEXT,
  current_score NUMERIC(3,1),
  previous_score NUMERIC(3,1),
  delta NUMERIC(3,1),
  status TEXT
) AS $$
DECLARE
  v_org_id UUID;
  v_previous_cycle_id UUID;
BEGIN
  -- Derive org from auth context; reject if unauthenticated or cycle not in caller's org
  v_org_id := public.get_user_org_id();

  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM cycles WHERE id = p_cycle_id AND org_id = v_org_id
  ) THEN
    RETURN;
  END IF;

  -- Find the previous closed cycle for this org
  SELECT id INTO v_previous_cycle_id
  FROM cycles
  WHERE org_id = v_org_id
    AND status = 'closed'
    AND id != p_cycle_id
    AND ends_at < (SELECT ends_at FROM cycles WHERE id = p_cycle_id)
  ORDER BY ends_at DESC
  LIMIT 1;

  RETURN QUERY
  WITH current_scores AS (
    SELECT * FROM get_cycle_scores(p_cycle_id)
  ),
  previous_scores AS (
    SELECT * FROM get_cycle_scores(v_previous_cycle_id)
  )
  SELECT
    cs.category_id,
    cs.category_name,
    cs.avg_score AS current_score,
    ps.avg_score AS previous_score,
    ROUND((cs.avg_score - COALESCE(ps.avg_score, cs.avg_score))::numeric, 1) AS delta,
    CASE
      WHEN cs.avg_score >= 7.2 THEN 'strong'
      WHEN cs.avg_score < 6.0 THEN 'needs_attention'
      ELSE 'stable'
    END AS status
  FROM current_scores cs
  LEFT JOIN previous_scores ps ON cs.category_id = ps.category_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Get anonymous signals (comments) for a cycle
-- NOTE: submitted_date is intentionally omitted — returning a date in a small team
-- (8–10 respondents) makes the last submitter identifiable. Comments are returned
-- in random order for the same reason.
CREATE OR REPLACE FUNCTION get_cycle_signals(p_cycle_id UUID)
RETURNS TABLE (
  comment TEXT,
  category_name TEXT
) AS $$
BEGIN
  -- Guard: verify the calling user belongs to this cycle's org
  IF NOT EXISTS (
    SELECT 1 FROM cycles WHERE id = p_cycle_id AND org_id = public.get_user_org_id()
  ) THEN
    RETURN;
  END IF;

  -- Only return if threshold met
  IF (SELECT COUNT(DISTINCT user_id) FROM responses WHERE cycle_id = p_cycle_id) < 8 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    r.comment,
    c.name AS category_name
    -- submitted_date deliberately excluded: ordering by time in small teams is re-identifying
  FROM responses r
  JOIN questions q ON r.question_id = q.id
  JOIN categories c ON q.category_id = c.id
  WHERE r.cycle_id = p_cycle_id
    AND r.comment IS NOT NULL
    AND r.comment != ''
  ORDER BY random();  -- random order prevents last-submitter identification
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Get response rate for a cycle
-- NOTE: original version had no org guard — any authenticated user could query
-- response counts for any org's cycle. Fixed: org is verified against auth context first.
CREATE OR REPLACE FUNCTION get_response_rate(p_cycle_id UUID)
RETURNS TABLE (
  responded BIGINT,
  total BIGINT,
  rate NUMERIC(5,2)
) AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Guard: verify caller belongs to this cycle's org before exposing any counts
  IF NOT EXISTS (
    SELECT 1 FROM cycles WHERE id = p_cycle_id AND org_id = public.get_user_org_id()
  ) THEN
    RETURN;
  END IF;

  SELECT org_id INTO v_org_id FROM cycles WHERE id = p_cycle_id;

  RETURN QUERY
  SELECT
    (SELECT COUNT(DISTINCT user_id) FROM responses WHERE cycle_id = p_cycle_id) AS responded,
    (SELECT COUNT(*) FROM users WHERE org_id = v_org_id AND role != 'super_admin') AS total,
    ROUND(
      (SELECT COUNT(DISTINCT user_id) FROM responses WHERE cycle_id = p_cycle_id)::numeric /
      NULLIF((SELECT COUNT(*) FROM users WHERE org_id = v_org_id AND role != 'super_admin'), 0) * 100,
      1
    ) AS rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
```

---

## 6. API Contracts

All API routes are Next.js Route Handlers under `/app/api/`.

### Survey

**POST `/api/survey/submit`**
```typescript
// Request
{
  cycle_id: string;
  responses: {
    question_id: string;
    score: number;       // 1-10
    comment?: string;
  }[];
}

// Response: 200
{ success: true }

// Response: 409 (already submitted)
{ error: "Already submitted for this cycle" }

// Response: 403 (cycle not open)
{ error: "Cycle is not open" }
```

**GET `/api/survey/active`**
```typescript
// Response: 200
{
  cycle: { id, title, starts_at, ends_at } | null;
  questions: { id, text, category_name }[];
  already_submitted: boolean;
}
```

### Dashboard

**GET `/api/dashboard/scores?cycle_id=X`**
```typescript
// Response: 200 (sufficient responses)
{
  overall_score: number;
  categories: {
    id: string;
    name: string;
    score: number;
    delta: number;
    status: "strong" | "needs_attention" | "stable";
  }[];
  response_rate: { responded: number; total: number; rate: number };
  strong_areas: number;  // count of categories with score >= 7.2
}

// Response: 200 (insufficient responses)
{
  insufficient_responses: true;
  response_rate: { responded: number; total: number; rate: number };
}
```

**GET `/api/dashboard/signals?cycle_id=X`**
```typescript
// Response: 200
// NOTE: no date field — omitted to prevent re-identification of last submitter in small teams
{
  signals: {
    comment: string;
    category: string;
  }[];
}
```

**GET `/api/dashboard/employee?cycle_id=X`**
```typescript
// Response: 200
{
  overall_score: number;
  strongest: { name: string; score: number };
  weakest: { name: string; score: number };
  recommended_articles: { id, title, description, url, read_time_min }[];
}
```

### AI Coach

**POST `/api/coach/chat`**
```typescript
// Request
{
  conversation_id?: string;  // omit to start new conversation
  message: string;
}

// Response: 200 (streaming)
// Server-Sent Events stream with assistant response chunks
// Final event includes conversation_id for continuity
```

### Admin

**POST `/api/admin/orgs`** — Create org
**POST `/api/admin/users/invite`** — Bulk invite (array of {email, role, org_id})
**POST `/api/admin/cycles`** — Create cycle
**PATCH `/api/admin/cycles/:id`** — Update cycle status (open/close)

### Individual Growth

**GET `/api/growth/notes`** — List user's coaching notes (ordered by created_at DESC)
**POST `/api/growth/notes`** — Create coaching note `{ content: string }`
**PATCH `/api/growth/notes/:id`** — Update note content
**DELETE `/api/growth/notes/:id`** — Delete note

**GET `/api/growth/goals`** — List user's dev plan goals
**POST `/api/growth/goals`** — Create goal `{ title, description?, status?, target_date? }`
**PATCH `/api/growth/goals/:id`** — Update goal (title, description, status, target_date)
**DELETE `/api/growth/goals/:id`** — Delete goal

**GET `/api/growth/articles`** — List active articles, optionally filtered by `?category_id=X`
**POST `/api/admin/articles`** — Create article (admin only) `{ title, description, url, category_id?, read_time_min? }`

**GET `/api/coach/conversations`** — List user's conversations (id, title, created_at)
**GET `/api/coach/conversations/:id/messages`** — Get messages for a conversation
**POST `/api/coach/chat`** — Send message (see above)

All `/api/growth/*` endpoints are scoped to `auth.uid()` via RLS. No org_id filtering needed — user can only access their own data.

---

## 7. Component Structure (Next.js App Router)

```
/app
  /layout.tsx                    Root layout (Supabase provider, auth context)
  /(auth)
    /login/page.tsx              Login form
    /accept-invite/page.tsx      Invite acceptance + password set
  /(app)
    /layout.tsx                  Authenticated layout (sidebar nav, role check)
    /dashboard/page.tsx          Leadership dashboard (leaders only)
    /team/page.tsx               Employee dashboard (employees only)
    /survey/page.tsx             Active survey submission
    /growth
      /layout.tsx                Growth section layout
      /notes/page.tsx            Coaching notes list + editor
      /plan/page.tsx             Dev plan goals
      /coach/page.tsx            AI coach chat
      /articles/page.tsx         Articles list
  /(admin)
    /admin/page.tsx              Admin panel (super_admin only)
    /admin/orgs/page.tsx         Org management
    /admin/cycles/page.tsx       Cycle management
    /admin/users/page.tsx        User management + bulk invite
/components
  /ui                            shadcn/ui primitives
  /dashboard
    CategoryCard.tsx             Score card with trend + status badge
    OverallScore.tsx             Big number display
    ResponseRate.tsx             X/Y with progress bar
    SignalsList.tsx              Anonymous comments feed
    TrendChart.tsx               Sparkline/line chart
  /survey
    QuestionCard.tsx             Slider + comment field per question
    SurveyForm.tsx               All questions grouped by category
  /growth
    NoteEditor.tsx               Rich text editor (tiptap or similar)
    GoalCard.tsx                 Goal with status toggle
    ChatInterface.tsx            Chat UI with streaming
  /admin
    OrgForm.tsx
    BulkInviteForm.tsx
    CycleManager.tsx
```

---

## 8. Email Notification Design

**Provider:** Resend (resend.com)

**Templates (3 total):**

1. **cycle_opened** — Subject: "Your leadership pulse survey is ready"
   - Body: brief intro, link to /survey, deadline (ends_at date)
   - Recipients: all users in org

2. **cycle_reminder** — Subject: "Reminder: Leadership pulse closes on {ends_at formatted}"
   - Body: reminder, link to /survey, dynamic close date (not hardcoded "3 days" — cycle length may vary)
   - Recipients: users in org who have NOT submitted (query: `users WHERE org_id = X AND id NOT IN (SELECT DISTINCT user_id FROM responses WHERE cycle_id = Y)`)

3. **cycle_closed** — Subject: "Your team's leadership insights are ready"
   - Body: brief summary, link to /dashboard
   - Recipients: users in org WHERE role = 'leader'

**Trigger mechanism:**
- Triggers 1 and 3: Fired from admin API routes when cycle status changes.
- Trigger 2: Vercel Cron Job (`vercel.json` cron config) runs daily at 9am UTC, checks for cycles where `status = 'open' AND starts_at + INTERVAL '4 days' <= now() AND starts_at + INTERVAL '5 days' > now()`.

---

## 9. AI Coach System Prompt Template

```
You are a leadership development coach for {user_name} at {org_name}.

Your role is to help this person grow as a leader through thoughtful questions, 
frameworks, and practical advice. You are warm, direct, and evidence-based.

CONTEXT ABOUT THIS PERSON:
- Role: {user_role}
- Latest team leadership scores (1-10 scale, anonymous team feedback):
  {category_scores_formatted}
- Their personal development goals:
  {dev_plan_goals_formatted}
- Recent coaching notes they've written:
  {recent_notes_summary}

GUIDELINES:
- Focus on leadership development, team dynamics, and personal growth.
- Reference their actual scores and goals when relevant.
- Suggest specific, actionable next steps.
- If asked about HR matters (termination, legal issues, compensation), advise 
  them to consult their HR team or a professional. Do not give HR advice.
- Keep responses concise and practical.
- Ask clarifying questions when the person's situation is ambiguous.
```

---

## 10. Non-Functional Requirements

| Concern | Approach |
|---------|----------|
| **Performance** | At 90 users, everything is trivially fast. No caching needed. Dashboard queries < 50ms. |
| **Availability** | Vercel + Supabase both offer 99.9% SLA on paid tiers. Acceptable for MVP. |
| **Security** | RLS for tenant isolation. HTTPS everywhere (Vercel default). Supabase auth handles password hashing, session tokens. No PII in logs. |
| **Backup** | Supabase provides daily backups on Pro plan. Point-in-time recovery available. |
| **Monitoring** | Vercel Analytics (free) for web vitals. Supabase Dashboard for DB metrics. Sentry for error tracking (free tier). |
| **Cost** | Supabase Free → Pro ($25/mo) if needed. Vercel Hobby → Pro ($20/mo) if needed. Resend free tier. LLM API: ~$5-10/mo at pilot scale. **Total: $0-60/mo.** |
