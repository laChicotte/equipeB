CREATE INDEX guest_attempt_expiry_idx ON game_attempt(expires_at) WHERE user_id IS NULL;
CREATE INDEX auth_session_expiry_idx ON auth_session(expires_at);
CREATE INDEX auth_session_revoked_idx ON auth_session(revoked_at) WHERE revoked_at IS NOT NULL;
CREATE INDEX email_token_expiry_idx ON email_token(expires_at);
CREATE INDEX email_token_consumed_idx ON email_token(consumed_at) WHERE consumed_at IS NOT NULL;
CREATE INDEX auth_rate_limit_expiry_idx ON auth_rate_limit(expires_at);
