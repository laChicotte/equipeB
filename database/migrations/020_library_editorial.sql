ALTER TABLE library_resource ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE library_resource ADD COLUMN editorial_key text UNIQUE;
ALTER TABLE library_resource ADD COLUMN editorial_hash text;
ALTER TABLE library_resource ADD COLUMN imported_by uuid REFERENCES app_user(id);
ALTER TABLE library_resource ADD CONSTRAINT library_editorial_provenance CHECK(
 (editorial_key IS NULL AND editorial_hash IS NULL AND imported_by IS NULL AND author_id IS NOT NULL) OR
 (editorial_key IS NOT NULL AND length(editorial_key) BETWEEN 3 AND 100 AND editorial_hash IS NOT NULL AND editorial_hash ~ '^[0-9a-f]{64}$' AND imported_by IS NOT NULL AND author_id IS NULL)
);
