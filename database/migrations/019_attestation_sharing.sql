ALTER TABLE participation_attestation ADD COLUMN share_token_hash text UNIQUE CHECK(share_token_hash IS NULL OR share_token_hash ~ '^[0-9a-f]{64}$');
