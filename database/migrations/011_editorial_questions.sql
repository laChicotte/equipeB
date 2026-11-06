CREATE TABLE editorial_quiz_batch (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE NOT NULL,
 content_hash text NOT NULL CHECK(length(content_hash)=64),
 provenance text NOT NULL DEFAULT 'ai_assisted' CHECK(provenance='ai_assisted'),
 sources_checked_at date NOT NULL, imported_by uuid NOT NULL REFERENCES app_user(id),
 category_id uuid NOT NULL REFERENCES game_category(id),
 title text NOT NULL, description text NOT NULL, level text NOT NULL,
 duration_minutes integer NOT NULL, points_per_answer integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE quiz_question ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE quiz_question ADD COLUMN editorial_batch_id uuid REFERENCES editorial_quiz_batch(id);
ALTER TABLE quiz_question ADD COLUMN editorial_ordinal integer;
ALTER TABLE quiz_question ADD CONSTRAINT quiz_origin CHECK(
 (author_id IS NOT NULL AND editorial_batch_id IS NULL AND editorial_ordinal IS NULL) OR
 (author_id IS NULL AND editorial_batch_id IS NOT NULL AND editorial_ordinal IS NOT NULL AND editorial_ordinal>=0));
CREATE UNIQUE INDEX editorial_question_position ON quiz_question(editorial_batch_id,editorial_ordinal);
ALTER TABLE quiz_question_version ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE quiz_question_version ADD COLUMN editorial_batch_id uuid REFERENCES editorial_quiz_batch(id);
ALTER TABLE quiz_question_version ADD CONSTRAINT quiz_version_origin CHECK(
 (created_by IS NOT NULL AND editorial_batch_id IS NULL) OR (created_by IS NULL AND editorial_batch_id IS NOT NULL));
CREATE OR REPLACE FUNCTION protect_quiz_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND
 (NEW.question_id,NEW.version,NEW.created_by,NEW.editorial_batch_id,NEW.category_id,NEW.level,NEW.stem,NEW.options,NEW.correct_index,NEW.explanation,NEW.source)
 IS DISTINCT FROM
 (OLD.question_id,OLD.version,OLD.created_by,OLD.editorial_batch_id,OLD.category_id,OLD.level,OLD.stem,OLD.options,OLD.correct_index,OLD.explanation,OLD.source)
 THEN RAISE EXCEPTION 'Question content is immutable; create a new version'; END IF;
 IF NEW.editorial_batch_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM quiz_question q WHERE q.id=NEW.question_id AND q.author_id IS NULL AND q.editorial_batch_id=NEW.editorial_batch_id)
 THEN RAISE EXCEPTION 'Editorial provenance mismatch'; END IF;
 IF NEW.status='approved' AND (COALESCE(NEW.reviewed_by=NEW.created_by,false) OR COALESCE(NEW.reviewed_by=(SELECT author_id FROM quiz_question WHERE id=NEW.question_id),false))
 THEN RAISE EXCEPTION 'Self approval is forbidden'; END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION protect_question_origin() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.author_id,NEW.editorial_batch_id,NEW.editorial_ordinal) IS DISTINCT FROM (OLD.author_id,OLD.editorial_batch_id,OLD.editorial_ordinal)
 THEN RAISE EXCEPTION 'Question origin is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER quiz_question_origin_guard BEFORE UPDATE ON quiz_question FOR EACH ROW EXECUTE FUNCTION protect_question_origin();
