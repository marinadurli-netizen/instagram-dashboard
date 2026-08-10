"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import type { RailPost } from "@/lib/db/dashboard";
import type { MedianRates } from "@/lib/db/posts";
import { formatCount } from "./format";
import { PostAnalyticsPanel } from "./PostAnalyticsPanel";

export function RecentPostsRail({ posts, medians }: { posts: RailPost[]; medians: MedianRates }) {
  const [selected, setSelected] = useState<RailPost | null>(null);

  if (posts.length === 0) {
    return (
      <div
        className="rounded-xl border p-6 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--panel)", color: "var(--muted)" }}
      >
        No posts yet.
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {posts.map((post) => (
          <div
            key={post.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelected(post)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setSelected(post);
            }}
            className="w-44 shrink-0 cursor-pointer overflow-hidden rounded-xl border text-left"
            style={{ borderColor: "var(--border)", background: "var(--panel)" }}
          >
            <div className="relative aspect-square w-full" style={{ background: "var(--panel-2)" }}>
              {post.thumb_url && (
                // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable CDN host
                <img src={post.thumb_url} alt="" className="h-full w-full object-cover" />
              )}
              <a
                href={post.url ?? "#"}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                aria-label="Open on Instagram"
                className="absolute right-2 top-2 rounded-full p-1"
                style={{ background: "rgba(0,0,0,0.55)" }}
              >
                <ExternalLink size={12} color="#fff" />
              </a>
            </div>
            <div className="p-3">
              <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                {formatCount(post.views)} views
              </div>
              {post.caption && (
                <div className="mt-1 line-clamp-2 text-xs" style={{ color: "var(--muted)" }}>
                  {post.caption}
                </div>
              )}
              <div className="mt-2 text-xs" style={{ color: "var(--faint)" }}>
                {post.posted_at ?? "—"}
              </div>
            </div>
          </div>
        ))}
      </div>
      {selected && <PostAnalyticsPanel post={selected} medians={medians} onClose={() => setSelected(null)} />}
    </>
  );
}
