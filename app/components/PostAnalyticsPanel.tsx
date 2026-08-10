"use client";

import { X } from "lucide-react";
import type { RailPost } from "@/lib/db/dashboard";
import type { MedianRates } from "@/lib/db/posts";
import { PostRateRows } from "./PostRates";

export function PostAnalyticsPanel({
  post,
  medians,
  onClose,
}: {
  post: RailPost;
  medians: MedianRates;
  onClose: () => void;
}) {
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
          <PostRateRows post={post} medians={medians} />
        </div>
      </div>
    </div>
  );
}
