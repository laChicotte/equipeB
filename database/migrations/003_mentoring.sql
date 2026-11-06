ALTER TABLE mentor_profile ADD COLUMN experience text NOT NULL DEFAULT '';
ALTER TABLE mentor_profile ADD COLUMN expertise text[] NOT NULL DEFAULT '{}';
ALTER TABLE mentor_profile ADD COLUMN formats text[] NOT NULL DEFAULT '{}';
ALTER TABLE mentor_profile ADD COLUMN availability text NOT NULL DEFAULT '';
ALTER TABLE mentor_profile ADD COLUMN professional_links text[] NOT NULL DEFAULT '{}';
ALTER TABLE mentor_profile ADD COLUMN publication_status text NOT NULL DEFAULT 'draft'
 CHECK(publication_status IN ('draft','submitted','published','rejected','suspended'));
ALTER TABLE mentor_profile ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK(revision>0);
ALTER TABLE mentor_profile ADD COLUMN review_note text NOT NULL DEFAULT '';
ALTER TABLE mentor_profile ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE mentor_profile ADD CONSTRAINT published_requires_verification CHECK(publication_status<>'published' OR verification_status='verified');
CREATE INDEX mentor_directory_idx ON mentor_profile(publication_status,public_name,user_id);
CREATE TABLE mentor_favorite (
 user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
 mentor_id uuid NOT NULL REFERENCES mentor_profile(user_id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,mentor_id)
);
CREATE TABLE mentoring_request (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 mentee_id uuid NOT NULL REFERENCES app_user(id),
 mentor_id uuid NOT NULL REFERENCES mentor_profile(user_id),
 goal text NOT NULL CHECK(length(goal) BETWEEN 20 AND 2000),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(mentee_id<>mentor_id)
);
CREATE UNIQUE INDEX mentoring_request_one_open ON mentoring_request(mentee_id,mentor_id) WHERE status IN ('pending','accepted');
CREATE INDEX mentoring_request_mentor_idx ON mentoring_request(mentor_id,created_at DESC);
CREATE INDEX mentoring_request_mentee_idx ON mentoring_request(mentee_id,created_at DESC);
CREATE TABLE mentoring_program (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid UNIQUE NOT NULL REFERENCES mentoring_request(id),
 goal text NOT NULL CHECK(length(goal) BETWEEN 20 AND 2000),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','completed','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
