-- Purple Signals — core schema (Phase 0.2)
-- See docs/system-design.md §2

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
  org_id      UUID REFERENCES orgs(id),  -- nullable: super_admin has no org
  email       TEXT NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('super_admin', 'leader', 'employee')),
  created_at  TIMESTAMPTZ DEFAULT now()
);
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
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id     UUID NOT NULL REFERENCES cycles(id),
  question_id  UUID NOT NULL REFERENCES questions(id),
  user_id      UUID NOT NULL REFERENCES users(id),
  score        INT NOT NULL CHECK (score >= 1 AND score <= 10),
  comment      TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (cycle_id, question_id, user_id)
);
CREATE INDEX idx_responses_cycle ON responses(cycle_id);
CREATE INDEX idx_responses_user_cycle ON responses(user_id, cycle_id);
