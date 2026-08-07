-- Replaces the Instagram-specific schema (ig_accounts / posts / post_metrics)
-- with a generic, multi-platform one: posts is keyed by (platform,
-- external_id) with metrics inline, and profile/auth are single-row tables
-- for the connected account and the app's own password gate.
--
-- The already-connected Instagram credentials in ig_accounts are carried
-- over into profile before that table is dropped, so reconnecting via
-- OAuth is not required again.

CREATE TABLE profile (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  display_name TEXT,
  handle TEXT,
  avatar_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  instagram_account_id TEXT,
  instagram_access_token TEXT,
  instagram_token_expires_at TIMESTAMPTZ,
  facebook_page_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;

INSERT INTO profile (id, handle, instagram_account_id, instagram_access_token, instagram_token_expires_at, facebook_page_id)
SELECT 1, username, id, access_token, token_expires_at, facebook_page_id
FROM ig_accounts
ORDER BY created_at DESC
LIMIT 1
ON CONFLICT (id) DO UPDATE SET
  handle = COALESCE(EXCLUDED.handle, profile.handle),
  instagram_account_id = COALESCE(EXCLUDED.instagram_account_id, profile.instagram_account_id),
  instagram_access_token = COALESCE(EXCLUDED.instagram_access_token, profile.instagram_access_token),
  instagram_token_expires_at = COALESCE(EXCLUDED.instagram_token_expires_at, profile.instagram_token_expires_at),
  facebook_page_id = COALESCE(EXCLUDED.facebook_page_id, profile.facebook_page_id);

DROP TABLE IF EXISTS post_metrics;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS ig_accounts;

CREATE TABLE posts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  platform TEXT NOT NULL,
  external_id TEXT NOT NULL,
  url TEXT,
  thumb_url TEXT,
  caption TEXT,
  script TEXT,
  posted_at DATE,
  views BIGINT NOT NULL DEFAULT 0,
  likes BIGINT NOT NULL DEFAULT 0,
  comments BIGINT NOT NULL DEFAULT 0,
  shares BIGINT NOT NULL DEFAULT 0,
  saves BIGINT NOT NULL DEFAULT 0,
  reach BIGINT NOT NULL DEFAULT 0,
  duration_s INTEGER,
  avg_watch_s DOUBLE PRECISION,
  total_watch_s DOUBLE PRECISION,
  handle TEXT NOT NULL,
  review TEXT,
  verdict TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (platform, external_id)
);
CREATE INDEX posts_handle_idx ON posts (handle);
CREATE INDEX posts_views_idx ON posts (views DESC);
CREATE INDEX posts_posted_at_idx ON posts (posted_at DESC);
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- AI post-mortems (post_id set) and cross-library pattern analyses
-- (post_id null) both live here, distinguished by `kind`.
CREATE TABLE insights (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id BIGINT REFERENCES posts (id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  content TEXT NOT NULL,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX insights_post_id_idx ON insights (post_id);
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- An AI-suggested (or self-initiated) reshoot of an existing post.
-- new_post_id is filled in once the remake is actually filmed and posted.
CREATE TABLE remakes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_post_id BIGINT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  new_post_id BIGINT REFERENCES posts (id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX remakes_source_post_id_idx ON remakes (source_post_id);
ALTER TABLE remakes ENABLE ROW LEVEL SECURITY;

-- Script writer / hook generator drafts. post_id is set once a draft is
-- actually filmed and posted; posts.script holds that post's final script
-- independent of this table's drafting history.
CREATE TABLE scripts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT,
  hook TEXT,
  body TEXT,
  post_id BIGINT REFERENCES posts (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX scripts_post_id_idx ON scripts (post_id);
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;

-- Content-planning boards (e.g. "this week's shoots").
CREATE TABLE boards (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

CREATE TABLE board_posts (
  board_id BIGINT NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
  post_id BIGINT NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
  position INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (board_id, post_id)
);
ALTER TABLE board_posts ENABLE ROW LEVEL SECURITY;

-- The app's own password gate (a later phase populates this row).
CREATE TABLE auth (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  password_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE auth ENABLE ROW LEVEL SECURITY;
