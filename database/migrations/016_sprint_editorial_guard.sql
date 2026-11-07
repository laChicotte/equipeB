-- Preserve editorial provenance rules while extending immutable AI provenance.
CREATE OR REPLACE FUNCTION protect_quiz_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND
 (NEW.question_id,NEW.version,NEW.created_by,NEW.editorial_batch_id,NEW.category_id,NEW.level,NEW.stem,NEW.options,NEW.correct_index,NEW.explanation,NEW.source,NEW.generation_id)
 IS DISTINCT FROM
 (OLD.question_id,OLD.version,OLD.created_by,OLD.editorial_batch_id,OLD.category_id,OLD.level,OLD.stem,OLD.options,OLD.correct_index,OLD.explanation,OLD.source,OLD.generation_id)
 THEN RAISE EXCEPTION 'Question content is immutable; create a new version'; END IF;
 IF NEW.editorial_batch_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM quiz_question q WHERE q.id=NEW.question_id AND q.author_id IS NULL AND q.editorial_batch_id=NEW.editorial_batch_id)
 THEN RAISE EXCEPTION 'Editorial provenance mismatch'; END IF;
 IF NEW.generation_id IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM ai_sprint_generation r JOIN quiz_question q ON q.id=NEW.question_id
  WHERE r.id=NEW.generation_id AND r.user_id=NEW.created_by AND q.author_id=NEW.created_by
   AND q.editorial_batch_id IS NULL AND NEW.editorial_batch_id IS NULL
 ) THEN RAISE EXCEPTION 'AI provenance mismatch'; END IF;
 IF NEW.status='approved' AND (COALESCE(NEW.reviewed_by=NEW.created_by,false) OR COALESCE(NEW.reviewed_by=(SELECT author_id FROM quiz_question WHERE id=NEW.question_id),false))
 THEN RAISE EXCEPTION 'Self approval is forbidden'; END IF;
 RETURN NEW;
END $$;
