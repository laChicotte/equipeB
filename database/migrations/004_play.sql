CREATE TABLE game_category (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text UNIQUE NOT NULL CHECK(length(name) BETWEEN 2 AND 100),
 expertise text NOT NULL CHECK(length(expertise) BETWEEN 2 AND 60), active boolean NOT NULL DEFAULT true
);
INSERT INTO game_category(name,expertise) VALUES
 ('Culture générale','Culture générale'),('Entrepreneuriat','Entrepreneuriat'),('Technologie et numérique','Numérique'),
 ('Développement personnel','Développement personnel'),('Leadership','Leadership'),('Communication','Communication'),
 ('Sciences','Sciences'),('Économie et finance','Finance'),('Histoire et géographie','Histoire'),
 ('Environnement','Environnement'),('Orientation professionnelle','Orientation'),('Compétences pratiques','Compétences pratiques');
CREATE TABLE quiz_question (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), author_id uuid NOT NULL REFERENCES app_user(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE quiz_question_version (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), question_id uuid NOT NULL REFERENCES quiz_question(id),
 version integer NOT NULL CHECK(version>0), category_id uuid NOT NULL REFERENCES game_category(id),
 level text NOT NULL CHECK(level IN ('beginner','intermediate','advanced')),
 stem text NOT NULL CHECK(length(stem) BETWEEN 10 AND 1000),
 options text[] NOT NULL CHECK(array_ndims(options)=1 AND array_lower(options,1)=1 AND cardinality(options)=3 AND array_position(options,NULL) IS NULL),
 correct_index integer NOT NULL CHECK(correct_index BETWEEN 0 AND 2),
 explanation text NOT NULL CHECK(length(explanation) BETWEEN 20 AND 2000), source text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','in_review','approved','rejected','archived')),
 reviewed_by uuid REFERENCES app_user(id), review_note text NOT NULL DEFAULT '', reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(question_id,version),
 CHECK(length(btrim(options[1])) BETWEEN 1 AND 300 AND length(btrim(options[2])) BETWEEN 1 AND 300 AND length(btrim(options[3])) BETWEEN 1 AND 300),
 CHECK(lower(btrim(options[1]))<>lower(btrim(options[2])) AND lower(btrim(options[1]))<>lower(btrim(options[3])) AND lower(btrim(options[2]))<>lower(btrim(options[3]))),
 CHECK(status<>'approved' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE FUNCTION protect_quiz_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND (NEW.question_id,NEW.version,NEW.category_id,NEW.level,NEW.stem,NEW.options,NEW.correct_index,NEW.explanation,NEW.source)
 IS DISTINCT FROM (OLD.question_id,OLD.version,OLD.category_id,OLD.level,OLD.stem,OLD.options,OLD.correct_index,OLD.explanation,OLD.source)
 THEN RAISE EXCEPTION 'Question content is immutable; create a new version'; END IF;
 IF NEW.status='approved' AND NEW.reviewed_by=(SELECT author_id FROM quiz_question WHERE id=NEW.question_id)
 THEN RAISE EXCEPTION 'Self approval is forbidden'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER quiz_version_guard BEFORE INSERT OR UPDATE ON quiz_question_version FOR EACH ROW EXECUTE FUNCTION protect_quiz_version();
CREATE TABLE quiz_game (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), author_id uuid NOT NULL REFERENCES app_user(id),
 title text NOT NULL CHECK(length(title) BETWEEN 3 AND 100), description text NOT NULL CHECK(length(description) BETWEEN 20 AND 1500),
 category_id uuid NOT NULL REFERENCES game_category(id), level text NOT NULL CHECK(level IN ('beginner','intermediate','advanced')),
 duration_minutes integer NOT NULL CHECK(duration_minutes BETWEEN 1 AND 120),
 points_per_answer integer NOT NULL DEFAULT 10 CHECK(points_per_answer BETWEEN 1 AND 100),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','published','archived')),
 reviewed_by uuid REFERENCES app_user(id), created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz,
 CHECK(status<>'published' OR (reviewed_by IS NOT NULL AND published_at IS NOT NULL))
);
CREATE TABLE game_question (
 game_id uuid NOT NULL REFERENCES quiz_game(id), ordinal integer NOT NULL CHECK(ordinal BETWEEN 0 AND 29),
 version_id uuid NOT NULL REFERENCES quiz_question_version(id), PRIMARY KEY(game_id,ordinal), UNIQUE(game_id,version_id)
);
CREATE TABLE game_attempt (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), game_id uuid NOT NULL REFERENCES quiz_game(id),
 owner_hash text NOT NULL CHECK(length(owner_hash)=64), user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
 snapshot jsonb NOT NULL, cursor integer NOT NULL DEFAULT 0 CHECK(cursor>=0),
 score integer NOT NULL DEFAULT 0 CHECK(score>=0), points_per_answer integer NOT NULL CHECK(points_per_answer BETWEEN 1 AND 100),
 started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz, expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',
 mentor_click_at timestamptz
);
CREATE INDEX game_attempt_user_idx ON game_attempt(user_id,started_at DESC);
CREATE TABLE game_attempt_answer (
 attempt_id uuid NOT NULL REFERENCES game_attempt(id) ON DELETE CASCADE, ordinal integer NOT NULL CHECK(ordinal>=0),
 choice integer NOT NULL CHECK(choice BETWEEN 0 AND 2), correct boolean NOT NULL, points integer NOT NULL CHECK(points>=0),
 answered_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(attempt_id,ordinal)
);
ALTER TABLE mentoring_request ADD COLUMN source_attempt_id uuid REFERENCES game_attempt(id);
