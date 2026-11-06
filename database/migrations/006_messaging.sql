CREATE TABLE message_conversation (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), program_id uuid NOT NULL UNIQUE REFERENCES mentoring_program(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE private_message (
 seq bigserial PRIMARY KEY, id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 conversation_id uuid NOT NULL REFERENCES message_conversation(id), sender_id uuid NOT NULL REFERENCES app_user(id),
 client_id uuid NOT NULL, body text NOT NULL CHECK(length(body) BETWEEN 1 AND 2000),
 created_at timestamptz NOT NULL DEFAULT now(), hidden_at timestamptz, hidden_by uuid REFERENCES app_user(id),
 UNIQUE(conversation_id,sender_id,client_id), CHECK((hidden_at IS NULL)=(hidden_by IS NULL))
);
CREATE INDEX private_message_conversation_idx ON private_message(conversation_id,seq DESC);
CREATE TABLE conversation_read (
 conversation_id uuid NOT NULL REFERENCES message_conversation(id), user_id uuid NOT NULL REFERENCES app_user(id),
 last_seq bigint NOT NULL DEFAULT 0 CHECK(last_seq>=0), PRIMARY KEY(conversation_id,user_id)
);
CREATE TABLE user_block (
 blocker_id uuid NOT NULL REFERENCES app_user(id), blocked_id uuid NOT NULL REFERENCES app_user(id),
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(blocker_id,blocked_id), CHECK(blocker_id<>blocked_id)
);
CREATE TABLE message_report (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), message_id uuid NOT NULL REFERENCES private_message(id),
 reporter_id uuid NOT NULL REFERENCES app_user(id),
 reason text NOT NULL CHECK(reason IN ('harassment','inappropriate','spam','safety','other')),
 details text NOT NULL CHECK(length(details) BETWEEN 10 AND 1000),
 evidence text NOT NULL CHECK(length(evidence) BETWEEN 1 AND 2000),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resolved','dismissed')),
 created_at timestamptz NOT NULL DEFAULT now(), reviewed_by uuid REFERENCES app_user(id), reviewed_at timestamptz,
 review_note text NOT NULL DEFAULT '', UNIQUE(message_id,reporter_id),
 CHECK(reviewed_by IS NULL OR reviewed_by<>reporter_id),
 CHECK(status='pending' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);
