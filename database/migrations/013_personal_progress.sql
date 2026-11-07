CREATE TABLE learning_step (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 goal_id uuid NOT NULL REFERENCES learning_goal(id) ON DELETE CASCADE,
 title text NOT NULL CHECK(length(title) BETWEEN 4 AND 180),
 kind text NOT NULL CHECK(kind IN ('step','milestone')),
 due_date date,
 completed boolean NOT NULL DEFAULT false,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX learning_step_goal_idx ON learning_step(goal_id,created_at,id);
CREATE TABLE learning_review (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 goal_id uuid NOT NULL REFERENCES learning_goal(id) ON DELETE CASCADE,
 body text NOT NULL CHECK(length(body) BETWEEN 10 AND 3000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE learning_goal_event (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 goal_id uuid NOT NULL REFERENCES learning_goal(id) ON DELETE CASCADE,
 action text NOT NULL CHECK(action IN ('created','updated','step_added','step_completed','step_reopened','review_added')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX learning_review_goal_idx ON learning_review(goal_id,created_at DESC,id);
CREATE INDEX learning_event_goal_idx ON learning_goal_event(goal_id,created_at DESC,id);
