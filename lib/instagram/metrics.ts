// Which insights metrics are valid depends on media_product_type, and Meta
// changes this set across Graph API versions (e.g. "impressions" was
// deprecated for most media in 2025). Requesting an invalid metric fails
// the *entire* insights call for that media, so keep these lists in sync
// with https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-media/insights
// when the app starts seeing insight errors after a Meta API upgrade.

// The subset valid for every non-story media type (image or video, feed or
// Reels) — safe to request as a field expansion on the /media list call
// itself, since it never varies per row. `views` and the Reels watch-time
// metrics are video-only and would blow up that expansion for a plain
// image post, so they're deliberately excluded here and fetched instead by
// the per-post backfill pass, which already knows each post's real type.
export const FEED_METRICS = ["reach", "saved", "shares", "comments", "likes", "total_interactions"];
// Confirmed against a live 400 error from the Graph API: this account's API
// version rejects the older `plays` metric name ("metric[6] must be one of
// the following values: ... views ...") — `views` is its replacement.
const FEED_VIDEO_METRICS = [...FEED_METRICS, "views"];
const REELS_METRICS = [
  ...FEED_METRICS,
  "views",
  "ig_reels_avg_watch_time",
  "ig_reels_video_view_total_time",
];
// Stories expire after 24h and generally aren't returned by the /media edge
// once expired, so this mostly matters for a story synced while still active.
const STORY_METRICS = ["reach", "replies", "navigation", "total_interactions"];

export function metricsForMedia(mediaType: string, mediaProductType: string | null): string[] {
  switch (mediaProductType) {
    case "REELS":
      return REELS_METRICS;
    case "STORY":
      return STORY_METRICS;
    case "FEED":
    default:
      return mediaType === "VIDEO" ? FEED_VIDEO_METRICS : FEED_METRICS;
  }
}

// A post qualifies for the watch-time/views backfill pass only if it's an
// actual video (plain feed video or Reels) — image and carousel posts have
// no watch-time data to fetch, ever.
export function isVideoMedia(mediaType: string): boolean {
  return mediaType === "VIDEO";
}

export interface RawInsightMetric {
  name: string;
  values?: Array<{ value: number }>;
  total_value?: { value: number };
}

// Keys match posts' own metric columns directly, so callers can spread this
// straight into an upsert() values object.
export interface MetricsValues {
  reach?: number;
  saves?: number;
  shares?: number;
  comments?: number;
  likes?: number;
  views?: number;
  avg_watch_s?: number;
  total_watch_s?: number;
}

function extractValue(metric: RawInsightMetric): number | undefined {
  if (metric.total_value) return metric.total_value.value;
  if (metric.values && metric.values.length > 0) return metric.values.at(-1)?.value;
  return undefined;
}

// ig_reels_avg_watch_time and ig_reels_video_view_total_time come back in
// milliseconds; posts stores seconds.
const msToSeconds = (ms: number) => ms / 1000;

export function parseInsightsBody(data: RawInsightMetric[]): MetricsValues {
  const result: MetricsValues = {};
  for (const metric of data) {
    const value = extractValue(metric);
    if (value === undefined) continue;
    switch (metric.name) {
      case "reach":
        result.reach = value;
        break;
      case "saved":
        result.saves = value;
        break;
      case "shares":
        result.shares = value;
        break;
      case "comments":
        result.comments = value;
        break;
      case "likes":
        result.likes = value;
        break;
      case "views":
        result.views = value;
        break;
      case "ig_reels_avg_watch_time":
        result.avg_watch_s = msToSeconds(value);
        break;
      case "ig_reels_video_view_total_time":
        result.total_watch_s = msToSeconds(value);
        break;
      // total_interactions has no column on posts (views/likes/comments/
      // shares/saves/reach cover it) — intentionally dropped.
    }
  }
  return result;
}
