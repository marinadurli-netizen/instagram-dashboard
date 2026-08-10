-- Instagram Graph API sync rewrite: single-request-per-page media+insights,
-- a capped per-post backfill pass for video-only metrics (views/watch-time),
-- proactive token refresh, and a per-post analytics panel.

-- media_type/media_product_type identify which posts are video/Reels — only
-- those carry watch-time data. watch_time_synced_at tracks the capped
-- per-run backfill pass so it can prioritize posts that have never been
-- backfilled, then refresh recently-posted ones whose numbers are still
-- moving, leaving the rest to fill in over subsequent runs.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_type TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_product_type TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS watch_time_synced_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS posts_watch_time_backfill_idx
  ON posts (handle, platform, media_type, watch_time_synced_at);

-- media_count is a plain metric, always overwritten by sync. last_synced_at
-- records when a sync last completed. instagram_token_refreshed_at is
-- distinct from instagram_token_expires_at (which OAuth connect leaves null
-- for a Page token, since those don't carry a hard expiry) — it's when the
-- app itself last rotated the stored access token, so sync knows when to
-- proactively refresh it rather than waiting for it to fail outright.
ALTER TABLE profile ADD COLUMN IF NOT EXISTS media_count BIGINT;
ALTER TABLE profile ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE profile ADD COLUMN IF NOT EXISTS instagram_token_refreshed_at TIMESTAMPTZ;
