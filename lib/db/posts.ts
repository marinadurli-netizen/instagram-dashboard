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
