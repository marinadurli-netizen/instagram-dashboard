-- Tracks which Facebook Page the connected IG Business account came from,
-- so a reconnect (re-running the OAuth flow) doesn't need FACEBOOK_PAGE_ID
-- set anywhere — the app already knows which Page to look for.
ALTER TABLE ig_accounts ADD COLUMN IF NOT EXISTS facebook_page_id TEXT;
