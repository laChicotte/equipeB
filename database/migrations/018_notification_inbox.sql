ALTER TABLE learning_notice DROP CONSTRAINT learning_notice_href_check;
ALTER TABLE learning_notice ADD CONSTRAINT learning_notice_href_check CHECK(href IN (
 '/bibliotheque/','/communaute/','/compte/progression/','/compte/profil-mentor/','/compte/contributions/','/play/'
));
CREATE INDEX learning_notice_inbox_idx ON learning_notice(user_id,created_at DESC,id DESC);
CREATE INDEX learning_notice_unread_idx ON learning_notice(user_id) WHERE read_at IS NULL;
