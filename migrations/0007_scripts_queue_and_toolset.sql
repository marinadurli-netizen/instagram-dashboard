-- Script Writer / Session Mode: a script drafted from a topic moves through
-- draft -> queued -> filmed. topic/caption/notes hold the rest of the AI
-- script route's output (hook/body already had columns).
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS caption TEXT;
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
CREATE INDEX IF NOT EXISTS scripts_status_idx ON scripts (status, created_at);
