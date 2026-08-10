import type { MedianRates } from "@/lib/db/posts";

export interface RatablePost {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  avg_watch_s: number | null;
  duration_s: number | null;
}

export interface PostRates {
  likeRate: number | null;
  saveRate: number | null;
  shareRate: number | null;
  commentRate: number | null;
  engagementRate: number | null;
  replayRate: number | null;
  watchPct: number | null;
}

function rate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

export function computePostRates(post: RatablePost): PostRates {
  return {
    likeRate: rate(post.likes, post.reach),
    saveRate: rate(post.saves, post.reach),
    shareRate: rate(post.shares, post.reach),
    commentRate: rate(post.comments, post.reach),
    engagementRate: rate(post.likes + post.comments + post.shares + post.saves, post.reach),
    // "Replays" — views divided by reach — is only meaningful once views has
    // actually been captured (video/Reels only; the watch-time backfill
    // fills this in over time, so a fresh video post may not have it yet).
    replayRate: post.views > 0 ? rate(post.views, post.reach) : null,
    watchPct: post.avg_watch_s != null && post.duration_s ? post.avg_watch_s / post.duration_s : null,
  };
}

export function fmtRate(n: number | null): string {
  return n === null ? "n/a" : `${(n * 100).toFixed(1)}%`;
}

export function fmtWatch(avgWatchS: number | null, durationS: number | null): string {
  if (avgWatchS == null) return "n/a";
  return `${avgWatchS.toFixed(1)}s${durationS ? ` / ${durationS}s` : ""}`;
}

// Relative change vs. this creator's own median for the same metric — same
// convention as the AI insights route's "headline_metric" (e.g. "+42%
// saves vs median"), so this number reads consistently with the rest of
// the app.
export function DeltaBadge({ value, median }: { value: number | null; median: number | null }) {
  if (value === null || median === null || median === 0) return null;
  const deltaPct = ((value - median) / median) * 100;
  const positive = deltaPct >= 0;
  return (
    <span className="text-xs font-medium" style={{ color: positive ? "var(--accent)" : "var(--warn)" }}>
      {positive ? "+" : ""}
      {deltaPct.toFixed(0)}% vs median
    </span>
  );
}

export function MetricRow({
  label,
  displayValue,
  deltaValue,
  deltaMedian,
}: {
  label: string;
  displayValue: string;
  deltaValue: number | null;
  deltaMedian: number | null;
}) {
  return (
    <div className="flex items-center justify-between border-b py-2.5 last:border-b-0" style={{ borderColor: "var(--border)" }}>
      <span className="text-sm" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          {displayValue}
        </span>
        <DeltaBadge value={deltaValue} median={deltaMedian} />
      </div>
    </div>
  );
}

export function PostRateRows({ post, medians }: { post: RatablePost; medians: MedianRates }) {
  const rates = computePostRates(post);
  return (
    <div>
      <MetricRow label="Like rate" displayValue={fmtRate(rates.likeRate)} deltaValue={rates.likeRate} deltaMedian={medians.likeRate} />
      <MetricRow label="Save rate" displayValue={fmtRate(rates.saveRate)} deltaValue={rates.saveRate} deltaMedian={medians.saveRate} />
      <MetricRow label="Share rate" displayValue={fmtRate(rates.shareRate)} deltaValue={rates.shareRate} deltaMedian={medians.shareRate} />
      <MetricRow
        label="Comment rate"
        displayValue={fmtRate(rates.commentRate)}
        deltaValue={rates.commentRate}
        deltaMedian={medians.commentRate}
      />
      <MetricRow
        label="Engagement rate"
        displayValue={fmtRate(rates.engagementRate)}
        deltaValue={rates.engagementRate}
        deltaMedian={medians.engagementRate}
      />
      <MetricRow
        label="Replays (views/reach)"
        displayValue={fmtRate(rates.replayRate)}
        deltaValue={rates.replayRate}
        deltaMedian={medians.viewToReachRate}
      />
      <MetricRow
        label="Watch time"
        displayValue={fmtWatch(post.avg_watch_s, post.duration_s)}
        deltaValue={rates.watchPct}
        deltaMedian={medians.watchPct}
      />
    </div>
  );
}
