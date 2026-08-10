"use client";

import { X } from "lucide-react";
import type { RailPost } from "@/lib/db/dashboard";
import type { MedianRates } from "@/lib/db/posts";

function rate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

function fmtRate(n: number | null): string {
  return n === null ? "n/a" : `${(n * 100).toFixed(1)}%`;
}

// Relative change vs. this creator's own median for the same metric — same
// convention as the AI insights route's "headline_metric" (e.g. "+42%
// saves vs median"), so the number here reads consistently with the rest
// of the app.
function DeltaBadge({ value, median }: { value: number | null; median: number | null }) {
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

function MetricRow({
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

export function PostAnalyticsPanel({
  post,
  medians,
  onClose,
}: {
  post: RailPost;
  medians: MedianRates;
  onClose: () => void;
}) {
  const likeRate = rate(post.likes, post.reach);
  const saveRate = rate(post.saves, post.reach);
  const shareRate = rate(post.shares, post.reach);
  const commentRate = rate(post.comments, post.reach);
  const engagementRate = rate(post.likes + post.comments + post.shares + post.saves, post.reach);
  // "Replays" — views divided by reach — is only meaningful once views has
  // actually been captured (video/Reels only; the second-pass backfill
  // fills this in over time, so a fresh video post may not have it yet).
  const replayRate = post.views > 0 ? rate(post.views, post.reach) : null;
  const watchPct = post.avg_watch_s != null && post.duration_s ? post.avg_watch_s / post.duration_s : null;
  const watchDisplay =
    post.avg_watch_s != null
      ? `${post.avg_watch_s.toFixed(1)}s${post.duration_s ? ` / ${post.duration_s}s` : ""}`
      : "n/a";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)" }} />
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl border p-5"
        style={{ borderColor: "var(--border)", background: "var(--panel)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {post.posted_at ?? "Unknown date"}
            </div>
            {post.caption && (
              <div className="mt-1 line-clamp-2 text-xs" style={{ color: "var(--muted)" }}>
                {post.caption}
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ color: "var(--faint)" }}>
            <X size={18} />
          </button>
        </div>

        <div className="mt-4">
          <MetricRow label="Like rate" displayValue={fmtRate(likeRate)} deltaValue={likeRate} deltaMedian={medians.likeRate} />
          <MetricRow label="Save rate" displayValue={fmtRate(saveRate)} deltaValue={saveRate} deltaMedian={medians.saveRate} />
          <MetricRow label="Share rate" displayValue={fmtRate(shareRate)} deltaValue={shareRate} deltaMedian={medians.shareRate} />
          <MetricRow
            label="Comment rate"
            displayValue={fmtRate(commentRate)}
            deltaValue={commentRate}
            deltaMedian={medians.commentRate}
          />
          <MetricRow
            label="Engagement rate"
            displayValue={fmtRate(engagementRate)}
            deltaValue={engagementRate}
            deltaMedian={medians.engagementRate}
          />
          <MetricRow
            label="Replays (views/reach)"
            displayValue={fmtRate(replayRate)}
            deltaValue={replayRate}
            deltaMedian={medians.viewToReachRate}
          />
          <MetricRow label="Watch time" displayValue={watchDisplay} deltaValue={watchPct} deltaMedian={medians.watchPct} />
        </div>
      </div>
    </div>
  );
}
