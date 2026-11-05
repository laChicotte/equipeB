-- Fondation de conception PostgreSQL. Non appliquée dans cette itération.
BEGIN;
CREATE TABLE app_user (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text NOT NULL,
 password_hash text NOT NULL,
 role text NOT NULL CHECK (role IN ('mentee','mentor','admin','moderator')),
 email_verified_at timestamptz,
 adult_access_approved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX app_user_email_unique ON app_user(lower(email));
CREATE TABLE auth_session (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
 token_hash text UNIQUE NOT NULL,
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz
);
CREATE TABLE email_token (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
 token_hash text UNIQUE NOT NULL,
 purpose text NOT NULL CHECK (purpose IN ('verify','reset')),
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz
);
CREATE TABLE consent (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
 purpose text NOT NULL,
 document_version text NOT NULL,
 accepted_at timestamptz NOT NULL DEFAULT now(),
 withdrawn_at timestamptz
);
CREATE TABLE mentor_profile (
 user_id uuid PRIMARY KEY REFERENCES app_user(id),
 public_name text NOT NULL,
 biography text NOT NULL DEFAULT '',
 skills text[] NOT NULL DEFAULT '{}',
 languages text[] NOT NULL DEFAULT '{}',
 general_location text,
 verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
 verified_by uuid REFERENCES app_user(id),
 verified_at timestamptz,
 CHECK (verification_status <> 'verified' OR (verified_by IS NOT NULL AND verified_at IS NOT NULL)),
 CHECK (verified_by IS NULL OR verified_by <> user_id)
);
CREATE TABLE audit_event (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_id uuid REFERENCES app_user(id),
 action text NOT NULL,
 resource_type text NOT NULL,
 resource_id uuid,
 created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
