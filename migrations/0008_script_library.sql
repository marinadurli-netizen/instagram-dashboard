-- Marking a script filmed only ever changed its status — the row (and its
-- text) was never deleted — but there was no page to see anything past
-- 'queued', so a filmed script looked gone. is_favorite backs a "Script
-- Library" page listing every script regardless of status, with a way to
-- flag favorites and requeue one for another day.
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS scripts_is_favorite_idx ON scripts (is_favorite, created_at);
