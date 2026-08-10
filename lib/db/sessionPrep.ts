import { query, queryOne } from "./query";
import { postedAtExpr } from "./postedAt";
import { todayKey } from "./localDate";

export interface CadenceStats {
  postsLast30: number;
  postsPrior30: number;
  changePct: number | null;
  daysMissedLast30: number;
}

// Same last30-vs-prior30 window shape as getRecentAverages() in
// dashboard.ts, applied to a post *count* instead of an averaged metric.
export async function getPostingCadence(handle: string): Promise<CadenceStats> {
  const postedAt = postedAtExpr();
  const row = await queryOne<{
    posts_last30: number;
    posts_prior30: number;
    active_days_last30: number;
  }>(
    `
    SELECT
      COUNT(*) FILTER (WHERE ${postedAt} >= $2::date - 30)                                    AS posts_last30,
      COUNT(*) FILTER (WHERE ${postedAt} < $2::date - 30 AND ${postedAt} >= $2::date - 60)     AS posts_prior30,
      COUNT(DISTINCT ${postedAt}) FILTER (WHERE ${postedAt} >= $2::date - 30)                  AS active_days_last30
    FROM posts
    WHERE handle = $1 AND ${postedAt} >= $2::date - 60
    `,
    [handle, todayKey()],
  );

  const postsLast30 = row?.posts_last30 ?? 0;
  const postsPrior30 = row?.posts_prior30 ?? 0;
  const activeDays = row?.active_days_last30 ?? 0;
  const changePct = postsPrior30 > 0 ? ((postsLast30 - postsPrior30) / postsPrior30) * 100 : null;

  return { postsLast30, postsPrior30, changePct, daysMissedLast30: 30 - activeDays };
}

export interface RemakeCandidate {
  id: number;
  thumb_url: string | null;
  caption: string | null;
  posted_at: string | null;
  views: number;
}

// All-time top performers — the posts most worth reshooting with a fresh
// angle, since they've already proven the format works.
export async function getTopPosts(handle: string, limit = 5): Promise<RemakeCandidate[]> {
  return query<RemakeCandidate>(
    `
    SELECT id, thumb_url, caption, posted_at, views
    FROM posts
    WHERE handle = $1
    ORDER BY views DESC
    LIMIT $2
    `,
    [handle, limit],
  );
}
