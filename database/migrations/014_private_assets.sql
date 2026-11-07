CREATE TABLE stored_asset (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES app_user(id),
 kind text NOT NULL CHECK(kind IN ('photo','document')),
 storage_key text NOT NULL UNIQUE,
 content_type text NOT NULL CHECK(content_type IN ('image/webp','application/pdf')),
 size_bytes integer NOT NULL CHECK(size_bytes BETWEEN 1 AND 2097152),
 sha256 text NOT NULL CHECK(length(sha256)=64),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','ready','failed')),
 rights_accepted_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stored_asset_owner_idx ON stored_asset(owner_id,created_at);
ALTER TABLE library_resource ADD COLUMN file_id uuid UNIQUE REFERENCES stored_asset(id);
ALTER TABLE mentor_profile ADD COLUMN photo_id uuid UNIQUE REFERENCES stored_asset(id);
