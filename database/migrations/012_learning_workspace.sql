CREATE TABLE learning_profile (
 user_id uuid PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
 display_name text NOT NULL CHECK(length(display_name) BETWEEN 2 AND 80),
 interests text NOT NULL DEFAULT '' CHECK(length(interests)<=500),
 ambition text NOT NULL DEFAULT '' CHECK(length(ambition)<=2000),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE library_resource (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 author_id uuid NOT NULL REFERENCES app_user(id),
 title text NOT NULL CHECK(length(title) BETWEEN 4 AND 160),
 summary text NOT NULL CHECK(length(summary) BETWEEN 15 AND 600),
 category text NOT NULL CHECK(length(category) BETWEEN 2 AND 80),
 kind text NOT NULL CHECK(kind IN ('guide','document','book','article')),
 body text NOT NULL CHECK(length(body) BETWEEN 30 AND 30000),
 source_url text NOT NULL DEFAULT '' CHECK(length(source_url)<=2048),
 rights text NOT NULL CHECK(length(rights) BETWEEN 10 AND 1000),
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','published','rejected','archived')),
 reviewed_by uuid REFERENCES app_user(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(reviewed_by IS NULL OR reviewed_by<>author_id),
 CHECK(status<>'published' OR reviewed_by IS NOT NULL)
);
CREATE INDEX library_catalog_idx ON library_resource(status,category,created_at DESC);
CREATE TABLE library_favorite (
 user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
 resource_id uuid NOT NULL REFERENCES library_resource(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,resource_id)
);
CREATE TABLE learning_goal (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
 title text NOT NULL CHECK(length(title) BETWEEN 4 AND 180),
 due_date date,
 status text NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','active','done')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE community_post (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 author_id uuid NOT NULL REFERENCES app_user(id),
 parent_id uuid REFERENCES community_post(id),
 body text NOT NULL CHECK(length(body) BETWEEN 5 AND 4000),
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','published','rejected','hidden')),
 reviewed_by uuid REFERENCES app_user(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(reviewed_by IS NULL OR reviewed_by<>author_id),
 CHECK(status<>'published' OR reviewed_by IS NOT NULL)
);
CREATE INDEX community_feed_idx ON community_post(status,created_at DESC);
CREATE TABLE community_reaction (
 user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
 post_id uuid NOT NULL REFERENCES community_post(id) ON DELETE CASCADE,
 PRIMARY KEY(user_id,post_id)
);
CREATE TABLE community_follow (
 user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
 followed_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
 PRIMARY KEY(user_id,followed_id), CHECK(user_id<>followed_id)
);
CREATE TABLE learning_notice (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
 body text NOT NULL CHECK(length(body)<=500),
 href text NOT NULL CHECK(href IN ('/bibliotheque/','/communaute/','/compte/progression/')),
 read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
