-- Purple Signals — individual growth + AI coach schema (Phase 2.1)
-- See docs/system-design.md §2

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
CREATE INDEX idx_articles_category ON articles(category_id);

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
