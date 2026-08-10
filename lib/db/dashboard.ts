import { query, queryOne } from "./query";
import { postedAtExpr } from "./postedAt";
import { todayKey } from "./localDate";

// Every function here takes `handle` and filters on it explicitly. Posts
// imported from other creators as reference material live in the same
// `posts` table (different `handle` values) and must never leak into any
// of these totals/averages/heatmap/insights — that's the whole point of
// the handle column, not an incidental detail.

export interface AllTimeStats {
  posts: number;
  views: number;
  avgViews: number;
  likes: number;
  saves: number;
  shares: number;
  reach: number;
}

export async function getAllTimeStats(handle: string): Promise<AllTimeStats> {
  const row = await queryOne<{
    posts: number;
    views: number;
    avg_views: number;
    likes: number;
    saves: number;
    shares: number;
    reach: number;
  }>(
    `
    SELECT
      COUNT(*) AS posts,
      COALESCE(SUM(views), 0) AS views,
      COALESCE(AVG(views), 0) AS avg_views,
      COALESCE(SUM(likes), 0) AS likes,
      COALESCE(SUM(saves), 0) AS saves,
      COALESCE(SUM(shares), 0) AS shares,
      COALESCE(SUM(reach), 0) AS reach
    FROM posts
    WHERE handle = $1
    `,
    [handle],
  );
  return {
    posts: row?.posts ?? 0,
    views: row?.views ?? 0,
    avgViews: row?.avg_views ?? 0,
    likes: row?.likes ?? 0,
    saves: row?.saves ?? 0,
    shares: row?.shares ?? 0,
    reach: row?.reach ?? 0,
  };
}

export interface MetricAverage {
  last30: number | null;
  prior30: number | null;
  changePct: number | null;
}

export type RecentAverages = Record<"views" | "likes" | "saves" | "shares", MetricAverage>;

export async function getRecentAverages(handle: string): Promise<RecentAverages> {
  const postedAt = postedAtExpr();
  const row = await queryOne<Record<string, number | null>>(
    `
    SELECT
      AVG(views)  FILTER (WHERE ${postedAt} >= $2::date - 30) AS views_last30,
      AVG(views)  FILTER (WHERE ${postedAt} <  $2::date - 30) AS views_prior30,
      AVG(likes)  FILTER (WHERE ${postedAt} >= $2::date - 30) AS likes_last30,
      AVG(likes)  FILTER (WHERE ${postedAt} <  $2::date - 30) AS likes_prior30,
      AVG(saves)  FILTER (WHERE ${postedAt} >= $2::date - 30) AS saves_last30,
      AVG(saves)  FILTER (WHERE ${postedAt} <  $2::date - 30) AS saves_prior30,
      AVG(shares) FILTER (WHERE ${postedAt} >= $2::date - 30) AS shares_last30,
      AVG(shares) FILTER (WHERE ${postedAt} <  $2::date - 30) AS shares_prior30
    FROM posts
    WHERE handle = $1 AND ${postedAt} >= $2::date - 60
    `,
    [handle, todayKey()],
  );

  function pair(metric: string): MetricAverage {
    const last30 = row?.[`${metric}_last30`] ?? null;
    const prior30 = row?.[`${metric}_prior30`] ?? null;
    const changePct = last30 !== null && prior30 !== null && prior30 !== 0 ? ((last30 - prior30) / prior30) * 100 : null;
    return { last30, prior30, changePct };
  }

  return {
    views: pair("views"),
    likes: pair("likes"),
    saves: pair("saves"),
    shares: pair("shares"),
  };
}

export interface RailPost {
  id: number;
  thumb_url: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  avg_watch_s: number | null;
  total_watch_s: number | null;
  duration_s: number | null;
  caption: string | null;
  posted_at: string | null;
  url: string | null;
}

// Selects every raw metric (not just `views`) so each card can open a
// per-post analytics panel without a second round-trip.
export async function getRecentPostsRail(handle: string, limit = 20): Promise<RailPost[]> {
  const postedAt = postedAtExpr();
  return query<RailPost>(
    `
    SELECT id, thumb_url, views, likes, comments, shares, saves, reach,
           avg_watch_s, total_watch_s, duration_s, caption, posted_at, url
    FROM posts
    WHERE handle = $1
    ORDER BY ${postedAt} DESC
    LIMIT $2
    `,
    [handle, limit],
  );
}

// Newest-first, capped at 500 — plenty for a personal account's full
// history without an unbounded query.
export async function getAllPostsHistory(handle: string): Promise<RailPost[]> {
  const postedAt = postedAtExpr();
  return query<RailPost>(
    `
    SELECT id, thumb_url, views, likes, comments, shares, saves, reach,
           avg_watch_s, total_watch_s, duration_s, caption, posted_at, url
    FROM posts
    WHERE handle = $1
    ORDER BY ${postedAt} DESC
    LIMIT 500
    `,
    [handle],
  );
}

export interface PickerPost {
  id: number;
  thumb_url: string | null;
  caption: string | null;
}

// Lightweight post list for a picker UI (Discover Boards) — no metrics,
// just enough to render a recognizable tile.
export async function getPostsForPicker(handle: string): Promise<PickerPost[]> {
  const postedAt = postedAtExpr();
  return query<PickerPost>(
    `
    SELECT id, thumb_url, caption
    FROM posts
    WHERE handle = $1
    ORDER BY ${postedAt} DESC
    LIMIT 200
    `,
    [handle],
  );
}

export interface InsightCard {
  id: number;
  kind: string;
  content: string;
  post_id: number | null;
  created_at: string;
}

// Insights aren't tagged with a handle of their own. A per-post insight
// (post_id set) is scoped by joining back to the post it's about, so one
// generated for a reference post from another creator can never surface
// here. A cross-library pattern (post_id NULL, from /api/ai/insights) has
// no post to join against — but in this single-account app it's always
// generated from *your* library (getPostsForAnalysis is handle-scoped at
// generation time), so it's included rather than dropped. An inner join
// here would silently exclude every cross-library pattern forever.
export async function getInsightCards(handle: string, limit = 10): Promise<InsightCard[]> {
  return query<InsightCard>(
    `
    SELECT insights.id, insights.kind, insights.content, insights.post_id, insights.created_at
    FROM insights
    LEFT JOIN posts ON posts.id = insights.post_id
    WHERE insights.post_id IS NULL OR posts.handle = $1
    ORDER BY insights.created_at DESC
    LIMIT $2
    `,
    [handle, limit],
  );
}

export interface HeatmapDay {
  date: string;
  count: number;
  inRange: boolean;
}

export interface HeatmapData {
  weeks: HeatmapDay[][];
  monthLabels: { weekIndex: number; label: string }[];
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Pure calendar-grid arithmetic below (week alignment, padding). It only
// ever adds/subtracts whole days from UTC-midnight anchors that already
// came from localDateKey()/postedAtExpr(), so it never re-derives "what
// day is this" from a raw instant — the one thing that must always go
// through local calendar parts.
function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getHeatmap(handle: string): Promise<HeatmapData> {
  const postedAt = postedAtExpr();
  const today = new Date(`${todayKey()}T00:00:00Z`);

  const RANGE_DAYS = 371; // ~53 weeks, a rolling 12 months
  const rangeStart = addDays(today, -(RANGE_DAYS - 1));
  const gridStart = addDays(rangeStart, -rangeStart.getUTCDay()); // back up to Sunday

  const rows = await query<{ day: string; count: number }>(
    `
    SELECT ${postedAt} AS day, COUNT(*) AS count
    FROM posts
    WHERE handle = $1 AND ${postedAt} >= $2::date
    GROUP BY day
    `,
    [handle, dateKey(gridStart)],
  );
  const counts = new Map(rows.map((r) => [r.day, r.count]));

  const rangeStartKey = dateKey(rangeStart);
  const days: HeatmapDay[] = [];
  for (let cursor = gridStart; cursor <= today; cursor = addDays(cursor, 1)) {
    const key = dateKey(cursor);
    days.push({ date: key, count: counts.get(key) ?? 0, inRange: key >= rangeStartKey });
  }
  while (days.length % 7 !== 0) {
    days.push({ date: "", count: 0, inRange: false });
  }

  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const monthLabels: { weekIndex: number; label: string }[] = [];
  let lastMonth = "";
  weeks.forEach((week, i) => {
    const firstReal = week.find((d) => d.date);
    if (!firstReal) return;
    const month = firstReal.date.slice(0, 7);
    if (month !== lastMonth) {
      monthLabels.push({ weekIndex: i, label: MONTH_NAMES[Number(firstReal.date.slice(5, 7)) - 1]! });
      lastMonth = month;
    }
  });

  return { weeks, monthLabels };
}
