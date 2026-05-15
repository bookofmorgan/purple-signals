-- Purple Signals — seed data (Phase 0.4)
-- Runs after migrations on `supabase db reset`.
-- All seed users use password: "password" (local-dev only).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- Helper: create a Supabase auth user + matching public.users row
-- ============================================================

CREATE OR REPLACE FUNCTION public.seed_create_user(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_role TEXT,
  p_org_id UUID,
  p_title TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated', 'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', p_name),
    now(), now(),
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    'email',
    p_email,
    now(), now(), now()
  );

  INSERT INTO public.users (id, org_id, email, name, role, title)
  VALUES (v_user_id, p_org_id, p_email, p_name, p_role, p_title);

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ============================================================
-- Categories — 6 leadership dimensions (per system design §3)
-- ============================================================

INSERT INTO categories (id, name, description, sort_order) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Direction Setting',     'Clarity of strategic vision, priorities, and communication of what matters most.', 1),
  ('11111111-0000-0000-0000-000000000002', 'Culture',               'Alignment between stated values and daily behaviours and standards.', 2),
  ('11111111-0000-0000-0000-000000000003', 'Performance Management','Accountability, expectations, and commitment to results across the organisation.', 3),
  ('11111111-0000-0000-0000-000000000004', 'Fresh Feedback',        'Quality, frequency, and psychological safety of feedback loops.', 4),
  ('11111111-0000-0000-0000-000000000005', 'Ownership',             'Responsibility, decision clarity, and autonomous problem-solving.', 5),
  ('11111111-0000-0000-0000-000000000006', 'Alignment',             'Coordination across teams, shared priorities, and smooth flow of work.', 6);

-- ============================================================
-- Questions — 2 per category. Placeholder text pending OQ-2 / OQ-4 / OQ-5.
-- ============================================================

INSERT INTO questions (id, category_id, text, is_active) VALUES
  -- Direction Setting
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
    'I understand what the leadership team has prioritised this quarter.', true),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001',
    'Leadership communicates a clear and compelling vision for where the company is going.', true),
  -- Culture
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002',
    'Day-to-day behaviour in this team matches the values we say we hold.', true),
  ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000002',
    'Leadership models the standards they expect from the rest of the team.', true),
  -- Performance Management
  ('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000003',
    'Performance expectations are clear and consistently applied across the team.', true),
  ('22222222-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000003',
    'When commitments are missed, leaders address it directly and constructively.', true),
  -- Fresh Feedback
  ('22222222-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000004',
    'I receive feedback from leadership often enough to act on it while it still matters.', true),
  ('22222222-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000004',
    'I feel safe raising hard truths or unpopular views with leadership.', true),
  -- Ownership
  ('22222222-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000005',
    'It is clear who owns each significant decision in this team.', true),
  ('22222222-0000-0000-0000-00000000000a', '11111111-0000-0000-0000-000000000005',
    'People here are trusted to solve problems without needing to escalate every detail.', true),
  -- Alignment
  ('22222222-0000-0000-0000-00000000000b', '11111111-0000-0000-0000-000000000006',
    'Teams across the company are working towards the same priorities.', true),
  ('22222222-0000-0000-0000-00000000000c', '11111111-0000-0000-0000-000000000006',
    'Hand-offs between teams are smooth and well-coordinated.', true);

-- ============================================================
-- Demo org + super admin
-- ============================================================

INSERT INTO orgs (id, name, slug) VALUES
  ('33333333-0000-0000-0000-000000000001', 'Acme Scale-up', 'acme-scaleup');

DO $$
DECLARE
  v_super UUID;
  v_leader UUID;
  v_employee UUID;
  v_e3 UUID; v_e4 UUID; v_e5 UUID; v_e6 UUID; v_e7 UUID; v_e8 UUID; v_e9 UUID;
  v_org UUID := '33333333-0000-0000-0000-000000000001';
  v_cycle_mar UUID := '44444444-0000-0000-0000-000000000003';
  v_cycle_apr UUID := '44444444-0000-0000-0000-000000000001';
  v_cycle_may UUID := '44444444-0000-0000-0000-000000000002';
  v_q UUID;
  v_user UUID;
  v_users UUID[];
  v_score INT;
  v_score_offset INT;
  v_comments TEXT[] := ARRAY[
    'Direction has been clearer this quarter, but I''d still like more visibility on trade-offs.',
    'I appreciate the consistency in expectations — it makes prioritisation easier.',
    'Sometimes I get the feedback weeks after the fact, which makes it harder to act on.',
    'Hand-offs between product and engineering still feel rough.',
    'We say we value ownership but every decision still needs three approvals.',
    'Leadership has been visibly more present in the last few weeks. It''s helping.',
    'I don''t always feel safe pushing back on senior leaders.',
    'Overall I think we''re on the right track, but execution is uneven across teams.',
    'The new quarterly roadmap sessions are excellent. Clear priorities, well-communicated.',
    'Cross-team pairing on the Q1 launch was the best collaboration I''ve experienced here.',
    'My manager gives genuinely helpful feedback. It''s specific and I can act on it.'
  ];
BEGIN
  v_super    := public.seed_create_user('admin@demo.com',    'password', 'Demo Admin',   'super_admin', NULL,  'Platform Admin');
  v_leader   := public.seed_create_user('leader@demo.com',   'password', 'James Mitchell','leader',     v_org, 'CEO');
  v_employee := public.seed_create_user('employee@demo.com', 'password', 'Eva Park',      'employee',   v_org, 'Senior Engineer');
  v_e3 := public.seed_create_user('emp3@demo.com', 'password', 'Sam Sandberg',    'employee', v_org, 'Engineer');
  v_e4 := public.seed_create_user('emp4@demo.com', 'password', 'Pat Powell',      'employee', v_org, 'Product Manager');
  v_e5 := public.seed_create_user('emp5@demo.com', 'password', 'Drew Davies',     'employee', v_org, 'Designer');
  v_e6 := public.seed_create_user('emp6@demo.com', 'password', 'Riley Reyes',     'employee', v_org, 'Engineer');
  v_e7 := public.seed_create_user('emp7@demo.com', 'password', 'Jess Jeong',      'employee', v_org, 'Customer Success');
  v_e8 := public.seed_create_user('emp8@demo.com', 'password', 'Morgan Marsh',    'leader',   v_org, 'VP Engineering');
  v_e9 := public.seed_create_user('emp9@demo.com', 'password', 'Casey Calderon',  'employee', v_org, 'Marketing');

  v_users := ARRAY[v_leader, v_employee, v_e3, v_e4, v_e5, v_e6, v_e7, v_e8, v_e9];

  -- ----- Cycles -----
  INSERT INTO cycles (id, org_id, title, starts_at, ends_at, status) VALUES
    -- Older closed cycle (provides trend baseline for April Pulse)
    (v_cycle_mar, v_org, 'March Pulse',
     now() - INTERVAL '63 days', now() - INTERVAL '56 days', 'closed'),
    -- Most recent closed cycle (the one dashboards default to)
    (v_cycle_apr, v_org, 'April Pulse',
     now() - INTERVAL '35 days', now() - INTERVAL '28 days', 'closed'),
    -- Currently running
    (v_cycle_may, v_org, 'May Pulse',
     now() - INTERVAL '2 days', now() + INTERVAL '5 days', 'open');

  -- Bind all 12 questions to all three cycles
  INSERT INTO cycle_questions (cycle_id, question_id)
    SELECT v_cycle_mar, id FROM questions;
  INSERT INTO cycle_questions (cycle_id, question_id)
    SELECT v_cycle_apr, id FROM questions;
  INSERT INTO cycle_questions (cycle_id, question_id)
    SELECT v_cycle_may, id FROM questions;

  -- ----- Responses for March Pulse (baseline, scores ~0.3 lower than April) -----
  FOREACH v_user IN ARRAY v_users LOOP
    v_score_offset := (abs(hashtext('mar' || v_user::text)) % 3) - 1;
    FOR v_q IN SELECT id FROM questions ORDER BY id LOOP
      v_score := LEAST(10, GREATEST(1,
        5 + ((abs(hashtext('mar' || v_q::text || v_user::text)) % 5)) - 2 + v_score_offset
      ));
      INSERT INTO responses (cycle_id, question_id, user_id, score, comment)
      VALUES (
        v_cycle_mar, v_q, v_user, v_score,
        CASE WHEN (abs(hashtext('mar' || v_q::text || v_user::text)) % 5) = 0
          THEN v_comments[((abs(hashtext('mar' || v_q::text || v_user::text)) / 5) % array_length(v_comments, 1)) + 1]
          ELSE NULL END
      );
    END LOOP;
  END LOOP;

  -- ----- Responses for April Pulse (most recent closed — slightly higher) -----
  FOREACH v_user IN ARRAY v_users LOOP
    v_score_offset := (abs(hashtext(v_user::text)) % 3) - 1;
    FOR v_q IN SELECT id FROM questions ORDER BY id LOOP
      v_score := LEAST(10, GREATEST(1,
        6 + ((abs(hashtext(v_q::text || v_user::text)) % 5)) - 2 + v_score_offset
      ));
      INSERT INTO responses (cycle_id, question_id, user_id, score, comment)
      VALUES (
        v_cycle_apr, v_q, v_user, v_score,
        CASE WHEN (abs(hashtext(v_q::text || v_user::text)) % 4) = 0
          THEN v_comments[((abs(hashtext(v_q::text || v_user::text)) / 4) % array_length(v_comments, 1)) + 1]
          ELSE NULL END
      );
    END LOOP;
  END LOOP;

  -- Articles surface on the employee dashboard and growth section.
  INSERT INTO articles (title, description, url, category_id, read_time_min, sort_order) VALUES
    ('Developing Your Leadership Presence',
     'Practical advice on how to lead with clarity and confidence in fast-moving environments.',
     'https://hbr.org/2014/06/developing-mindful-leaders',
     '11111111-0000-0000-0000-000000000001', 5, 1),
    ('From Manager to Leader',
     'Understanding the mindset shift required when moving from managing tasks to leading people.',
     'https://hbr.org/2003/12/the-7-transformations-of-leadership',
     '11111111-0000-0000-0000-000000000002', 7, 2),
    ('Building Resilience as a Leader',
     'How to maintain energy, focus, and composure when leading through uncertainty.',
     'https://hbr.org/2015/06/resilience-is-about-how-you-recharge-not-how-you-endure',
     '11111111-0000-0000-0000-000000000005', 6, 3),
    ('The Six Dimensions of Leadership Health',
     'A deeper look at the framework behind Purple Signals and how to apply it personally.',
     'https://hbr.org/2019/03/the-feedback-fallacy',
     '11111111-0000-0000-0000-000000000004', 8, 4),
    ('Measure What Matters',
     'John Doerr on OKRs and clarifying direction at scale.',
     'https://www.whatmatters.com/the-book/',
     '11111111-0000-0000-0000-000000000001', 20, 5),
    ('Crucial Conversations',
     'Tools for talking when stakes are high.',
     'https://www.amazon.com/Crucial-Conversations-Talking-Stakes-Second/dp/1469266822',
     '11111111-0000-0000-0000-000000000003', 25, 6);
END $$;

-- Drop the helper now that seeding is done.
DROP FUNCTION public.seed_create_user(TEXT, TEXT, TEXT, TEXT, UUID, TEXT);
