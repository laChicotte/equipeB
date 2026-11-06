CREATE TABLE mentoring_session (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 program_id uuid NOT NULL REFERENCES mentoring_program(id),
 proposed_by uuid NOT NULL REFERENCES app_user(id),
 client_id uuid NOT NULL,
 title text NOT NULL CHECK(length(title) BETWEEN 3 AND 120),
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL CHECK(ends_at>starts_at AND ends_at<=starts_at+interval '3 hours'),
 status text NOT NULL DEFAULT 'proposed' CHECK(status IN ('proposed','confirmed','cancelled','completed')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(proposed_by,client_id)
);
CREATE INDEX mentoring_session_program_idx ON mentoring_session(program_id,starts_at DESC);
CREATE TABLE mentoring_objective (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 program_id uuid NOT NULL REFERENCES mentoring_program(id),
 created_by uuid NOT NULL REFERENCES app_user(id),
 client_id uuid NOT NULL,
 title text NOT NULL CHECK(length(title) BETWEEN 3 AND 200),
 due_date date,
 status text NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','doing','done','cancelled')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(created_by,client_id)
);
CREATE INDEX mentoring_objective_program_idx ON mentoring_objective(program_id,created_at DESC);
