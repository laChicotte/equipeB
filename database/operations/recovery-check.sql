-- Read-only checks to run on the source and the isolated recovered branch.
-- Save results privately; do not post account data or connection strings.
BEGIN READ ONLY;
SET LOCAL search_path TO talentlink,public;
SELECT now() AT TIME ZONE 'UTC' AS observed_at_utc;
SELECT name,checksum FROM schema_migration ORDER BY name;
SELECT role,count(*) AS account_count FROM app_user GROUP BY role ORDER BY role;
SELECT publication_status,count(*) AS mentor_count FROM mentor_profile GROUP BY publication_status ORDER BY publication_status;
SELECT status,count(*) AS game_count FROM quiz_game GROUP BY status ORDER BY status;
SELECT status,count(*) AS version_count FROM quiz_question_version GROUP BY status ORDER BY status;
SELECT md5(coalesce(string_agg(id::text||':'||status,',' ORDER BY id),'')) AS quiz_state_fingerprint FROM quiz_game;
SELECT md5(coalesce(string_agg(id::text||':'||status,',' ORDER BY id),'')) AS question_state_fingerprint FROM quiz_question_version;
SELECT md5(coalesce(string_agg(slug||':'||content_hash,',' ORDER BY slug),'')) AS editorial_fingerprint FROM editorial_quiz_batch;
COMMIT;
