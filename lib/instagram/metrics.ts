// Which insights metrics are valid depends on media_product_type, and Meta
// changes this set across Graph API versions (e.g. "impressions" was
// deprecated for most media in 2025). Requesting an invalid metric fails
// the *entire* insights call for that media, so keep these lists in sync
// with https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-media/insights
// when the app starts seeing insight errors after a Meta API upgrade.

const FEED_METRICS = ["reach", "saved", "shares", "comments", "likes", "total_interactions"];
const FEED_VIDEO_METRICS = [...FEED_METRICS, "plays"];
const REELS_METRICS = [
  ...FEED_METRICS,
  "plays",
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
