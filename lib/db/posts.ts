import { query, queryOne } from "./query";
import { postedAtExpr } from "./postedAt";
import { todayKey } from "./localDate";

export interface MedianMetrics {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach: number | null;
}

export interface MedianMetricsOptions {
  windowDays?: number;
}

// Medians are computed in SQL via percentile_cont, not by pulling every row
// into JS and sorting there — this scales fine as the post library grows
// and keeps "median" defined in exactly one place.
export async function getMedianMetrics(
  handle: string,
  { windowDays }: MedianMetricsOptions = {},
): Promise<MedianMetrics> {
  const postedAt = postedAtExpr();
  const windowClause = windowDays ? `AND ${postedAt} >= $2::date - $3::int` : "";
  const params: unknown[] = windowDays ? [handle, todayKey(), windowDays] : [handle];

  const row = await queryOne<MedianMetrics>(
    `
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY views)    AS views,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY likes)    AS likes,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY comments) AS comments,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY shares)   AS shares,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY saves)    AS saves,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY reach)    AS reach
    FROM posts
    WHERE handle = $1 ${windowClause}
    `,
    params,
  );

  return (
    row ?? { views: null, likes: null, comments: null, shares: null, saves: null, reach: null }
  );
}

export interface MedianRates {
  likeRate: number | null;
  saveRate: number | null;
  shareRate: number | null;
  commentRate: number | null;
  viewToReachRate: number | null;
  watchPct: number | null;
}

// Rates (saves per reach, etc.) computed per-post, then medianed in SQL via
// percentile_cont — same rule as raw-metric medians: never sort a pulled
// array in JS to find this.
export async function getMedianRates(handle: string): Promise<MedianRates> {
  const row = await queryOne<{
    like_rate: number | null;
    save_rate: number | null;
    share_rate: number | null;
    comment_rate: number | null;
    view_to_reach_rate: number | null;
    watch_pct: number | null;
  }>(
    `
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY likes::float8 / NULLIF(reach, 0))    AS like_rate,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY saves::float8 / NULLIF(reach, 0))    AS save_rate,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY shares::float8 / NULLIF(reach, 0))   AS share_rate,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY comments::float8 / NULLIF(reach, 0)) AS comment_rate,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY views::float8 / NULLIF(reach, 0))
        FILTER (WHERE views > 0)                                                       AS view_to_reach_rate,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY avg_watch_s / NULLIF(duration_s, 0))
        FILTER (WHERE avg_watch_s IS NOT NULL AND duration_s IS NOT NULL)              AS watch_pct
    FROM posts
    WHERE handle = $1
    `,
    [handle],
  );

  return {
    likeRate: row?.like_rate ?? null,
    saveRate: row?.save_rate ?? null,
    shareRate: row?.share_rate ?? null,
    commentRate: row?.comment_rate ?? null,
    viewToReachRate: row?.view_to_reach_rate ?? null,
    watchPct: row?.watch_pct ?? null,
  };
}

export interface PostForReview {
  id: number;
  caption: string | null;
  posted_at: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  duration_s: number | null;
  avg_watch_s: number | null;
  total_watch_s: number | null;
}

// Scoped to `handle` at the fetch itself, not just at the caller's
// discretion — a postId from another creator's imported reference posts
// simply doesn't resolve, by construction, not by remembering to filter.
export async function getPostForReview(id: number, handle: string): Promise<PostForReview | undefined> {
  return queryOne<PostForReview>(
    `
    SELECT id, caption, posted_at, views, likes, comments, shares, saves, reach,
           duration_s, avg_watch_s, total_watch_s
    FROM posts
    WHERE id = $1 AND handle = $2
    `,
    [id, handle],
  );
}

export interface PostForModel {
  id: number;
  caption: string | null;
  script: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
}

export async function getPostForModel(id: number, handle: string): Promise<PostForModel | undefined> {
  return queryOne<PostForModel>(
    `
    SELECT id, caption, script, views, likes, comments, shares, saves, reach
    FROM posts
    WHERE id = $1 AND handle = $2
    `,
    [id, handle],
  );
}

export interface PostForAnalysis {
  id: number;
  posted_at: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  avg_watch_s: number | null;
  duration_s: number | null;
  caption: string | null;
}

// Capped at 100 posts to keep the prompt bounded as the library grows —
// the most recent 100 is plenty for pattern-finding.
export async function getPostsForAnalysis(handle: string, limit = 100): Promise<PostForAnalysis[]> {
  const postedAt = postedAtExpr();
  return query<PostForAnalysis>(
    `
    SELECT id, posted_at, views, likes, comments, shares, saves, reach, avg_watch_s, duration_s, caption
    FROM posts
    WHERE handle = $1
    ORDER BY ${postedAt} DESC
    LIMIT $2
    `,
    [handle, limit],
  );
}

export interface PostRow {
  id: number;
  platform: string;
  external_id: string;
  url: string | null;
  thumb_url: string | null;
  caption: string | null;
  posted_at: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  handle: string;
}

// Example consumer of postedAtExpr() for a windowed listing — every future
// "last N days" query should follow this same shape.
export async function listRecentPosts(handle: string, windowDays: number): Promise<PostRow[]> {
  const postedAt = postedAtExpr();
  return query<PostRow>(
    `
    SELECT id, platform, external_id, url, thumb_url, caption, posted_at,
           views, likes, comments, shares, saves, reach, handle
    FROM posts
    WHERE handle = $1 AND ${postedAt} >= $2::date - $3::int
    ORDER BY ${postedAt} DESC
    `,
    [handle, todayKey(), windowDays],
  );
}
