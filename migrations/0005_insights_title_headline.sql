-- The cross-library pattern insights route returns a title and a
-- quantified headline metric alongside the body text; `content` alone
-- (the body) isn't enough to render them separately in the UI.
ALTER TABLE insights ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS headline_metric TEXT;
