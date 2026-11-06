ALTER TABLE quiz_question_version ADD COLUMN created_by uuid REFERENCES app_user(id);
UPDATE quiz_question_version v SET created_by=q.author_id FROM quiz_question q WHERE q.id=v.question_id;
ALTER TABLE quiz_question_version ALTER COLUMN created_by SET NOT NULL;
CREATE OR REPLACE FUNCTION protect_quiz_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND
 (NEW.question_id,NEW.version,NEW.created_by,NEW.category_id,NEW.level,NEW.stem,NEW.options,NEW.correct_index,NEW.explanation,NEW.source)
 IS DISTINCT FROM
 (OLD.question_id,OLD.version,OLD.created_by,OLD.category_id,OLD.level,OLD.stem,OLD.options,OLD.correct_index,OLD.explanation,OLD.source)
 THEN RAISE EXCEPTION 'Question content is immutable; create a new version'; END IF;
 IF NEW.status='approved' AND (NEW.reviewed_by=NEW.created_by OR NEW.reviewed_by=(SELECT author_id FROM quiz_question WHERE id=NEW.question_id))
 THEN RAISE EXCEPTION 'Self approval is forbidden'; END IF;
 RETURN NEW;
END $$;
