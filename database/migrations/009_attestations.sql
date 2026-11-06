CREATE TABLE participation_attestation (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 program_id uuid NOT NULL UNIQUE REFERENCES mentoring_program(id),
 recipient_id uuid NOT NULL REFERENCES app_user(id),
 mentor_name text NOT NULL,
 program_started_at timestamptz NOT NULL,
 program_completed_at timestamptz NOT NULL CHECK(program_completed_at>=program_started_at),
 completed_sessions integer NOT NULL CHECK(completed_sessions>0),
 issued_by uuid NOT NULL REFERENCES app_user(id),
 issued_at timestamptz NOT NULL DEFAULT now(),
 revoked_by uuid REFERENCES app_user(id),
 revoked_at timestamptz,
 revocation_reason text NOT NULL DEFAULT '',
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 CHECK((revoked_at IS NULL AND revoked_by IS NULL AND revocation_reason='') OR (revoked_at IS NOT NULL AND revoked_by IS NOT NULL AND length(revocation_reason) BETWEEN 10 AND 500))
);
CREATE INDEX participation_attestation_recipient_idx ON participation_attestation(recipient_id,issued_at DESC);
