import { APP_TIMEZONE } from "./localDate";

const TZ_PATTERN = /^[A-Za-z0-9_+\-/]+$/;

// The single definition of "when did this post happen": posted_at when
// it's known, otherwise the row's created_at converted into the given
// timezone. Every windowed query (medians, trends, "last N days") must
// filter/order on this, not on posted_at or created_at directly, or posts
// ingested without a known posted_at silently fall out of every window.
//
// The timezone is spliced directly into the SQL (not bound as a query
// parameter) because it's trusted config (an env var), never request
// input, and `AT TIME ZONE` needs a plain identifier/literal, not a
// parameter whose position shifts depending on the caller's other bind
// params. TZ_PATTERN guards against a malformed env var producing invalid
// SQL rather than against attacker input.
export function postedAtExpr(timezone: string = APP_TIMEZONE): string {
  if (!TZ_PATTERN.test(timezone)) {
    throw new Error(`Unsafe timezone value: ${timezone}`);
  }
  return `COALESCE(posts.posted_at, (posts.created_at AT TIME ZONE '${timezone}')::date)`;
}
