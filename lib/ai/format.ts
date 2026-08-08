import type { PostForAnalysis, PostForReview, MedianRates } from "@/lib/db/posts";

// A pipe-delimited table, not markdown or JSON — compact, unambiguous to
// the model, and cheap on tokens across up to 100 rows.
export function formatPostsTable(posts: PostForAnalysis[]): string {
  const header = "id|posted_at|views|likes|comments|shares|saves|reach|avg_watch_s|duration_s|caption";
  const rows = posts.map((p) =>
    [
      p.id,
      p.posted_at ?? "",
      p.views,
      p.likes,
      p.comments,
      p.shares,
      p.saves,
      p.reach,
      p.avg_watch_s ?? "",
      p.duration_s ?? "",
      truncateCaption(p.caption),
    ].join("|"),
  );
  return [header, ...rows].join("\n");
}

function truncateCaption(caption: string | null): string {
  if (!caption) return "";
  const flattened = caption.replace(/\s+/g, " ").trim();
  return flattened.length > 140 ? `${flattened.slice(0, 140)}…` : flattened;
}

function rate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

function fmtRate(n: number | null): string {
  return n === null ? "n/a" : `${(n * 100).toFixed(1)}%`;
}

function fmtPct(n: number | null): string {
  return n === null ? "n/a" : `${(n * 100).toFixed(0)}%`;
}

export function formatPostForReview(post: PostForReview, medians: MedianRates): string {
  const postRates = {
    likeRate: rate(post.likes, post.reach),
    saveRate: rate(post.saves, post.reach),
    shareRate: rate(post.shares, post.reach),
    commentRate: rate(post.comments, post.reach),
    viewToReachRate: post.views > 0 ? rate(post.views, post.reach) : null,
    watchPct: post.avg_watch_s != null && post.duration_s ? post.avg_watch_s / post.duration_s : null,
  };

  const lines = [
    `Caption: ${post.caption ?? "(none)"}`,
    `Posted: ${post.posted_at ?? "unknown date"}`,
    "",
    "Raw metrics — this post:",
    `  views=${post.views} likes=${post.likes} comments=${post.comments} shares=${post.shares} saves=${post.saves} reach=${post.reach}`,
    post.duration_s != null
      ? `  duration=${post.duration_s}s avg_watch=${post.avg_watch_s ?? "n/a"}s total_watch=${post.total_watch_s ?? "n/a"}s`
      : "  (no video/watch-time data — this is not a video post)",
    "",
    "This post's rates vs. this creator's own median rate (across their whole library):",
    `  like rate:  ${fmtRate(postRates.likeRate)}  (median ${fmtRate(medians.likeRate)})`,
    `  save rate:  ${fmtRate(postRates.saveRate)}  (median ${fmtRate(medians.saveRate)})`,
    `  share rate: ${fmtRate(postRates.shareRate)}  (median ${fmtRate(medians.shareRate)})`,
    `  comment rate: ${fmtRate(postRates.commentRate)}  (median ${fmtRate(medians.commentRate)})`,
    postRates.viewToReachRate !== null
      ? `  views/reach: ${fmtRate(postRates.viewToReachRate)}  (median ${fmtRate(medians.viewToReachRate)})`
      : "",
    postRates.watchPct !== null
      ? `  watch % of duration: ${fmtPct(postRates.watchPct)}  (median ${fmtPct(medians.watchPct)})`
      : "",
  ];

  return lines.filter(Boolean).join("\n");
}
