CREATE TABLE ai_sprint_generation (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
 request_key uuid NOT NULL, input_hash text NOT NULL CHECK(length(input_hash)=64),
 model text NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','failed')),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,request_key)
);
CREATE INDEX ai_sprint_generation_daily_idx ON ai_sprint_generation(created_at,user_id);
ALTER TABLE quiz_game ADD COLUMN generation_id uuid UNIQUE REFERENCES ai_sprint_generation(id);
ALTER TABLE quiz_question_version ADD COLUMN generation_id uuid REFERENCES ai_sprint_generation(id);
ALTER TABLE quiz_question_version DROP CONSTRAINT quiz_question_version_status_check;
ALTER TABLE quiz_question_version ADD CONSTRAINT quiz_question_version_status_check
 CHECK(status IN ('draft','submitted','in_review','approved','rejected','archived','ai_ready'));
ALTER TABLE quiz_question_version ADD CONSTRAINT quiz_ai_provenance CHECK(
 (generation_id IS NULL AND status<>'ai_ready') OR
 (generation_id IS NOT NULL AND status IN ('ai_ready','rejected','archived') AND reviewed_by IS NULL)
);
DO $$ DECLARE constraint_name text; BEGIN
 SELECT conname INTO STRICT constraint_name FROM pg_constraint
 WHERE conrelid='quiz_game'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%reviewed_by%';
 EXECUTE format('ALTER TABLE quiz_game DROP CONSTRAINT %I',constraint_name);
END $$;
ALTER TABLE quiz_game ADD CONSTRAINT quiz_game_publication_provenance CHECK(
 status<>'published' OR (published_at IS NOT NULL AND (reviewed_by IS NOT NULL OR generation_id IS NOT NULL))
);
CREATE OR REPLACE FUNCTION protect_quiz_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND
 (NEW.question_id,NEW.version,NEW.created_by,NEW.category_id,NEW.level,NEW.stem,NEW.options,NEW.correct_index,NEW.explanation,NEW.source,NEW.generation_id)
 IS DISTINCT FROM
 (OLD.question_id,OLD.version,OLD.created_by,OLD.category_id,OLD.level,OLD.stem,OLD.options,OLD.correct_index,OLD.explanation,OLD.source,OLD.generation_id)
 THEN RAISE EXCEPTION 'Question content is immutable; create a new version'; END IF;
 IF NEW.status='approved' AND (NEW.reviewed_by=NEW.created_by OR NEW.reviewed_by=(SELECT author_id FROM quiz_question WHERE id=NEW.question_id))
 THEN RAISE EXCEPTION 'Self approval is forbidden'; END IF;
 RETURN NEW;
END $$;
CREATE TABLE ai_sprint_report (
 game_id uuid NOT NULL REFERENCES quiz_game(id), user_id uuid NOT NULL REFERENCES app_user(id),
 reason text NOT NULL CHECK(reason IN ('incorrect','inappropriate','personal_data')),
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(game_id,user_id)
);
