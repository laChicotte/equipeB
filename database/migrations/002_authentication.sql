ALTER TABLE app_user ADD COLUMN adult_declared_at timestamptz;
ALTER TABLE app_user ADD COLUMN disabled_at timestamptz;
ALTER TABLE auth_session ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE email_token ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX auth_session_user_idx ON auth_session(user_id);
CREATE INDEX email_token_user_idx ON email_token(user_id,purpose);
CREATE UNIQUE INDEX email_token_one_active ON email_token(user_id,purpose) WHERE consumed_at IS NULL;
CREATE TABLE auth_rate_limit (
 bucket text PRIMARY KEY,
 attempts integer NOT NULL CHECK(attempts > 0),
 expires_at timestamptz NOT NULL
);
