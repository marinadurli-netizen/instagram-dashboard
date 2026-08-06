-- Core schema: the connected IG account, its posts, and the current metrics
-- snapshot per post. Historical metric snapshots (for trend/growth analysis)
-- and the AI-feature tables (post-mortems, pattern analyses, scripts, hooks)
-- are added in later migrations once those phases start.

CREATE TABLE IF NOT EXISTS ig_accounts (
  id TEXT PRIMARY KEY,              -- Instagram user id (IG Graph API)
  username TEXT NOT NULL,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ig_accounts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,              -- Instagram media id
  account_id TEXT NOT NULL REFERENCES ig_accounts (id) ON DELETE CASCADE,
  media_type TEXT NOT NULL,         -- IMAGE | VIDEO | CAROUSEL_ALBUM
  media_product_type TEXT,          -- FEED | REELS | STORY
  caption TEXT,
  permalink TEXT,
  media_url TEXT,
  thumbnail_url TEXT,
  posted_at TIMESTAMPTZ NOT NULL,
  posted_date DATE NOT NULL,        -- local calendar day for posted_at, from localDateKey()
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS posts_account_id_posted_at_idx ON posts (account_id, posted_at DESC);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS post_metrics (
  post_id TEXT PRIMARY KEY REFERENCES posts (id) ON DELETE CASCADE,
  reach BIGINT,
  impressions BIGINT,
  saved BIGINT,
  shares BIGINT,
  comments BIGINT,
  likes BIGINT,
  plays BIGINT,                     -- video/reel plays
  total_interactions BIGINT,
  avg_watch_time_seconds NUMERIC,
  total_watch_time_seconds NUMERIC,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE post_metrics ENABLE ROW LEVEL SECURITY;
